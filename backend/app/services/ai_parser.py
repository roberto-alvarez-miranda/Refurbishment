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
        self.model_id = 'gemini-3.1-pro-preview'
        self.client = None
        
        # Only use impersonation if a service_account_email claim is explicitly present in the token
        if user and user.get("service_account_email"):
            service_account_email = user.get("service_account_email")
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
                    location="global",
                    credentials=impersonated_creds
                )
                logger.info(f"Initialized GenAI client with service account impersonation in location 'global' for: {service_account_email}")
            except Exception as e:
                logger.warning(f"Failed to initialize genai client with impersonation: {e}")
        else:
            # Fallback to standard Application Default Credentials (ADC) for demo/standard auth users
            try:
                self.client = genai.Client(
                    vertexai=True,
                    project=os.getenv("GOOGLE_CLOUD_PROJECT", "app-reformia"),
                    location="global"
                )
                logger.info("Initialized GenAI client in location 'global' using standard Application Default Credentials (ADC)")
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
                
                # 4. Feed the raw data to Gemini 3.1 Pro for intelligent semantic cleaning and synthesis!
                return self._synthesize_cad_data_with_gemini(raw_cad_data)

        # Fallback to Gemini Multimodal for images and PDFs
        logger.info("Multimodal document detected. Routing to Gemini AI model...")
        if not self.client:
            raise RuntimeError("Gemini client is not initialized.")

        prompt = (
            "You are an expert architect and cost estimator. Carefully analyze the provided floor plan, blueprint, or room image. "
            "Our focus in this phase is to capture highly detailed room-by-room measurements to start a refurbishment project in Presto/CYPE style.\n\n"
            
            "Identify each distinct housing unit/dwelling (e.g. 'Vivienda Tipo A', 'Vivienda Tipo B') on the sheet. "
            "For each distinct dwelling, extract:\n"
            "1. Name and total area in m².\n"
            "2. Estancias (rooms) aggregated by category ('cocina', 'baño', 'pasillo', 'dormitorio', 'salón'). Sum their areas and perimeters.\n"
            "3. **Height (`height_m`)**: For each estancia, extract or estimate the free ceiling height (typical is 2.50 to 2.80 meters).\n"
            "4. **Detailed Individual Wall/Partitions (`tabiques`)**: For each estancia, identify each individual wall segment to be demolished or built. "
            "For each wall segment, provide a `label` (e.g., 'Tabique divisorio con Cocina', 'Tabique Oeste'), `length_m` (m), `height_m` (m), "
            "and compute `area_m2` = length_m * height_m. Do NOT group all walls into a single lump sum.\n"
            "5. **Plumbing and Sanitary Fixtures (`sanitarios`)**: For wet rooms (cocinas, baños), identify each individual fixture mentioned or visible "
            "(e.g., 'inodoro', 'lavabo', 'bañera', 'plato de ducha', 'caldera', 'fregadero'). Assign an action: 'retirar' (if they are being removed for refurbishment), "
            "'conservar' or 'instalar nuevo'.\n"
            "6. **Proposed Materials**: ONLY extract materials if they are explicitly mentioned. Otherwise, leave it empty.\n"
            "7. Estimation of exterior facade walls in ml.\n\n"
            "Respond strictly with a structured JSON matching the provided schema."
        )

        file_part = types.Part.from_uri(file_uri=gcs_uri, mime_type=mime_type)

        response = self.client.models.generate_content(
            model=self.model_id,
            contents=[file_part, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ExtractedPlan,
                thinking_config=types.ThinkingConfig(thinking_level="high")
            ),
        )

        return response.parsed

    def _synthesize_cad_data_with_gemini(self, raw_cad_data: dict) -> ExtractedPlan:
        """
        Feeds raw CAD coordinates and texts to Gemini 3.1 Pro to clean noise, match rooms semantically, 
        and output a perfect high-fidelity ExtractedPlan.
        """
        if not self.client:
            raise RuntimeError("Gemini client is not initialized.")

        prompt = (
            "You are an expert architect, quantity surveyor, and cost estimator. We have extracted raw vector data, "
            "line lengths per layer, and text annotations from an architectural CAD (DXF/DWG) floor plan.\n\n"
            
            "Our focus in this phase is to capture structured data to start a refurbishment project matching Presto/CYPE standards.\n\n"
            
            "### CRITICAL UNDERSTANDING (PRESTO/CYPE COMPLIANCE):\n"
            "In professional estimating software like Presto or CYPE, measurements are highly structured and room-by-room (by estancia).\n"
            "1. **No global wall totals**: You MUST list each wall/partition segment (`tabiques`) individually for each estancia (e.g. 'Tabique armario', 'Tabique divisorio con Pasillo'). "
            "Provide its exact `length_m` (m), `height_m` (m) (typical height is 2.50 to 2.80 m), and mathematical `area_m2` = length_m * height_m. "
            "This wall surface area (m²) is critical to estimate demolition and plaster/painting works accurately!\n"
            "2. **Plumbing per Estancia**: Plumbing is calculated room-by-room (e.g., Baño plumbing vs Cocina plumbing). "
            "Identify and list every sanitary appliance, fixture, or heating boiler (`sanitarios` - e.g., 'inodoro', 'bañera', 'caldera', 'lavabo', 'fregadero') "
            "found in each room. Set `action='retirar'` to specify that these existing appliances must be dismantled/removed to clear the space.\n\n"
            
            "### RULES:\n"
            "1. **Identify Real Dwellings**: Cluster rooms and texts into distinct housing units. Name them clearly (e.g., 'Vivienda Tipo A - 59.80m²', 'Vivienda Tipo B - 101.09m²').\n"
            "2. **Group Estancias by Category & Location**: Inside each dwelling, aggregate all room areas (m2) and perimeters (ml) by their type/category: "
            "'cocina', 'baño', 'pasillo', 'dormitorio', 'salón'.\n"
            "3. **Populate Tabiques & Sanitarios**: Allocate exact partition segments and sanitary items directly to their respective estancias.\n"
            "4. **No Hardcoded Materials**: ONLY populate `proposed_materials` if they are explicitly mentioned or annotated in the `text_annotations` "
            "for that room coordinates. If there is no evidence, leave `proposed_materials` as an empty list so the user can define it on the frontend.\n"
            "5. **CRITICAL: Noise Filtering**: You MUST completely ignore and filter out all drawing metadata, title blocks, layout notes, dates, "
            "and company text annotations (e.g. 'VERSO ESPACIO RESIDENCIAL S.L.', 'ENERO 2022', 'CALLE GENERAL ELORZA', layouts, scale labels). These are not rooms!\n\n"
            
            "### RAW CAD DATA:\n"
            f"{json.dumps(raw_cad_data, indent=2)}\n\n"
            
            "Return the consolidated, clean multi-dwelling floor plan structured exactly as requested in the JSON schema."
        )

        logger.info("Sending raw CAD metadata to Gemini 3.1 Pro for semantic multi-dwelling synthesis...")
        response = self.client.models.generate_content(
            model=self.model_id,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ExtractedPlan,
                thinking_config=types.ThinkingConfig(thinking_level="high")
            ),
        )

        return response.parsed

    def chat_with_context(self, message: str, plan_context: ExtractedPlan, history: list = []) -> str:
        """
        Maintains a context-aware conversation with Gemini 3.1 Pro about the current extracted plan.
        """
        if not self.client:
            raise RuntimeError("Gemini client is not initialized.")

        # Serialize Pydantic plan context
        context_str = json.dumps(plan_context.model_dump(), indent=2)

        system_instruction = (
            "You are an expert architect, quantity surveyor, and cost estimator. "
            "You are assisting a homeowner/developer with their refurbishment project based on a CAD floor plan. "
            "Answer any questions they have about the dwellings, rooms, dimensions, areas, partition wall lengths per room, specific tabiques, sanitarios removal, or material choices "
            "accurately, professionally, and concisely in Spanish.\n\n"
            "### ESTADO ACTUAL DEL PROYECTO (PLAN CONTEXT):\n"
            f"{context_str}"
        )

        logger.info("Initiating conversational chat with Gemini 3.1 Pro...")
        response = self.client.models.generate_content(
            model=self.model_id,
            contents=message,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                thinking_config=types.ThinkingConfig(thinking_level="medium")
            )
        )
        return response.text
