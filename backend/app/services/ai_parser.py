import os
import tempfile
import logging
import json
from google import genai
from google.genai import types
import google.auth
from google.auth.impersonated_credentials import Credentials as ImpersonatedCredentials
from google.cloud import storage
from app.models.plan import ExtractedPlan
from app.services.cad_parser import CADParser

logger = logging.getLogger(__name__)

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "application/pdf",
    "application/dxf",
    "image/vnd.dxf",
    "application/x-autocad",
    "application/x-dxf",
    "application/octet-stream", # Generic binary used by browsers for .dxf and .dwg
    "application/x-dwg"
}

class AIParsingService:
    def __init__(self, user: dict = None):
        self.model_id = 'gemini-3.5-flash'
        self.client = None
        if user:
            service_account_email = user.get("service_account_email")
            if not service_account_email:
                raise ValueError("Missing service_account_email claim in user token")
            
            try:
                source_creds, project_id = google.auth.default()
                impersonated_creds = ImpersonatedCredentials(
                    source_credentials=source_creds,
                    target_principal=service_account_email,
                    target_scopes=["https://www.googleapis.com/auth/cloud-platform"],
                    lifetime=3600
                )
                self.client = genai.Client(
                    vertexai=True,
                    project=os.getenv("GOOGLE_CLOUD_PROJECT", "app-reformia"),
                    location="us-central1",
                    credentials=impersonated_creds
                )
            except Exception as e:
                logger.warning(f"Failed to initialize genai client with impersonation: {e}")
        else:
            try:
                self.client = genai.Client(
                    vertexai=True,
                    project=os.getenv("GOOGLE_CLOUD_PROJECT", "app-reformia"),
                    location="us-central1"
                )
            except Exception as e:
                logger.warning(f"Failed to initialize fallback genai client: {e}")

    def _download_gcs_file(self, gcs_uri: str, local_path: str):
        """Downloads a file from a Google Cloud Storage URI to a local path."""
        if not gcs_uri.startswith("gs://"):
            raise ValueError(f"Invalid GCS URI: {gcs_uri}")
        parts = gcs_uri[5:].split("/", 1)
        bucket_name = parts[0]
        blob_name = parts[1]
        
        logger.info(f"Downloading GCS blob 'gs://{bucket_name}/{blob_name}' to local '{local_path}'")
        storage_client = storage.Client()
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        blob.download_to_filename(local_path)

    def parse_blueprint(self, gcs_uri: str, mime_type: str) -> ExtractedPlan:
        """
        Parses a blueprint. If the file is CAD (.dxf / .dwg), parses it semantically and vectorially.
        If it's an image or PDF, uses Gemini Multimodal AI.
        """
        if mime_type not in ALLOWED_MIME_TYPES:
            raise ValueError(f"Unsupported mime type for parsing: {mime_type}")
        
        # Check if it is a CAD file
        lower_uri = gcs_uri.lower()
        is_dwg = lower_uri.endswith(".dwg") or mime_type == "application/x-dwg"
        is_dxf = lower_uri.endswith(".dxf") or mime_type in ["application/dxf", "image/vnd.dxf", "application/x-dxf", "application/octet-stream"]

        if is_dwg or is_dxf:
            logger.info("CAD file detected. Routing to vector parser and semantic AI synthesis...")
            
            with tempfile.TemporaryDirectory() as temp_dir:
                # 1. Download the file locally
                local_suffix = ".dwg" if is_dwg else ".dxf"
                temp_input = os.path.join(temp_dir, f"input_cad{local_suffix}")
                self._download_gcs_file(gcs_uri, temp_input)
                
                # 2. Handle DWG-to-DXF conversion if binary DWG
                if is_dwg:
                    temp_dxf = os.path.join(temp_dir, "converted_cad.dxf")
                    success = CADParser.convert_dwg_to_dxf(temp_input, temp_dxf)
                    if not success:
                        raise RuntimeError("Failed to convert binary DWG file to ASCII DXF.")
                    parse_target = temp_dxf
                else:
                    parse_target = temp_input
                
                # 3. Extract raw scale, mathematics areas, and all text elements
                raw_cad_data = CADParser.extract_raw_cad_data(parse_target)
                
                # 4. Feed the raw data to Gemini 3.5 Flash for intelligent semantic cleaning and synthesis!
                return self._synthesize_cad_data_with_gemini(raw_cad_data)

        # Fallback to Gemini Multimodal for images and PDFs
        logger.info("Multimodal document detected. Routing to Gemini AI model...")
        if not self.client:
            raise RuntimeError("Gemini client is not initialized.")

        prompt = (
            "You are an expert architect and cost estimator. Carefully analyze the provided floor plan, blueprint, or room image. "
            "Our focus in this phase is to capture structured room-by-room data to start a refurbishment project in Presto/CYPE style.\n\n"
            
            "Identify each distinct housing unit/dwelling (e.g. 'Vivienda Tipo A', 'Vivienda Tipo B') on the sheet. "
            "For each distinct dwelling, extract:\n"
            "1. Name and total area in m².\n"
            "2. Estancias (rooms) aggregated by category ('cocina', 'baño', 'pasillo', 'dormitorio', 'salón'). Sum their areas and perimeters.\n"
            "3. **Partition Walls per Estancia (ml)**: Calculate/estimate the exact linear meters (ml) of partition walls specifically associated "
            "with each estancia (rather than a lump sum for the whole house). For example, a bathroom typically has 6-8 ml of surrounding partition walls to demolish or build.\n"
            "4. **Proposed Materials**: ONLY extract materials if they are explicitly mentioned. Otherwise, leave it empty.\n"
            "5. Estimation of exterior facade walls in ml.\n\n"
            "Respond strictly with a structured JSON matching the provided schema."
        )

        file_part = types.Part.from_uri(file_uri=gcs_uri, mime_type=mime_type)

        response = self.client.models.generate_content(
            model=self.model_id,
            contents=[file_part, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ExtractedPlan,
                temperature=0.0
            ),
        )

        return response.parsed

    def _synthesize_cad_data_with_gemini(self, raw_cad_data: dict) -> ExtractedPlan:
        """
        Feeds raw CAD coordinates and texts to Gemini 2.5 Flash to clean noise, match rooms semantically, 
        and output a perfect high-fidelity ExtractedPlan.
        """
        if not self.client:
            raise RuntimeError("Gemini client is not initialized.")

        prompt = (
            "You are an expert architect, quantity surveyor, and cost estimator. We have extracted raw vector data, "
            "line lengths per layer, and text annotations from an architectural CAD (DXF/DWG) floor plan.\n\n"
            
            "Our focus in this phase is to capture structured data to start a refurbishment project matching Presto/CYPE standards.\n\n"
            
            "### CRITICAL UNDERSTANDING (PRESTO/CYPE COMPLIANCE):\n"
            "In professional estimating software like Presto or CYPE, measurements are structured room-by-room (by estancia). "
            "Estimators DO NOT demolish all partition walls in one single lump sum. Instead, you must estimate/allocate the "
            "linear meters (ml) of partition walls (`partition_walls_ml`) SPECIFICALLY for each individual estancia. "
            "For example, a Cocina (kitchen) might have 8.5 ml of partitions, a Baño (bathroom) 6.2 ml, and a Bedroom 12.0 ml.\n\n"
            
            "### RULES:\n"
            "1. **Identify Real Dwellings**: Cluster rooms and texts into distinct housing units. Name them clearly (e.g., 'Vivienda Tipo A - 59.80m²', 'Vivienda Tipo B - 101.09m²').\n"
            "2. **Group Estancias by Category & Location**: Inside each dwelling, aggregate all room areas (m2) and perimeters (ml) by their type/category: "
            "'cocina', 'baño', 'pasillo', 'dormitorio', 'salón'.\n"
            "3. **Partition Walls per Estancia (ml)**: Analyze the `layer_line_lengths_meters` of partition layers. "
            "Distribute these partition wall lengths (divided by 2 to account for double-line drawing) into each individual estancia under its `partition_walls_ml` field. "
            "A standard room has approx. 0.6 to 1.2 ml of partition wall per m² of area. Ensure the sum of all rooms' `partition_walls_ml` matches the real partition lines of that unit.\n"
            "4. **No Hardcoded Materials**: ONLY populate `proposed_materials` if they are explicitly mentioned or annotated in the `text_annotations` "
            "for that room coordinates (e.g. text containing 'gres', 'mármol', 'parqué', 'pintura plástica'). If there is no evidence, leave `proposed_materials` as an empty list "
            "so the user can define it on the frontend.\n"
            "5. **CRITICAL: Noise Filtering**: You MUST completely ignore and filter out all drawing metadata, title blocks, layout notes, dates, "
            "and company text annotations (e.g. 'VERSO ESPACIO RESIDENCIAL S.L.', 'ENERO 2022', 'CALLE GENERAL ELORZA', layouts, scale labels). These are not rooms!\n\n"
            
            "### RAW CAD DATA:\n"
            f"{json.dumps(raw_cad_data, indent=2)}\n\n"
            
            "Return the consolidated, clean multi-dwelling floor plan structured exactly as requested in the JSON schema."
        )

        logger.info("Sending raw CAD metadata to Gemini 3.5 Flash for semantic multi-dwelling synthesis...")
        response = self.client.models.generate_content(
            model=self.model_id,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ExtractedPlan,
                temperature=0.0
            ),
        )

        return response.parsed

    def chat_with_context(self, message: str, plan_context: ExtractedPlan, history: list = []) -> str:
        """
        Maintains a context-aware conversation with Gemini 2.5 Flash about the current extracted plan.
        """
        if not self.client:
            raise RuntimeError("Gemini client is not initialized.")

        # Serialize Pydantic plan context
        context_str = json.dumps(plan_context.model_dump(), indent=2)

        system_instruction = (
            "You are an expert architect, quantity surveyor, and cost estimator. "
            "You are assisting a homeowner/developer with their refurbishment project based on a CAD floor plan. "
            "Answer any questions they have about the dwellings, rooms, dimensions, areas, partition wall lengths per room, or material choices "
            "accurately, professionally, and concisely in Spanish.\n\n"
            "### ESTADO ACTUAL DEL PROYECTO (PLAN CONTEXT):\n"
            f"{context_str}"
        )

        logger.info("Initiating conversational chat with Gemini 3.5 Flash...")
        response = self.client.models.generate_content(
            model=self.model_id,
            contents=message,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.7
            )
        )
        return response.text
