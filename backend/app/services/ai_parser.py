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
                    location="europe-southwest1",
                    credentials=impersonated_creds
                )
            except Exception as e:
                logger.warning(f"Failed to initialize genai client with impersonation: {e}")
        else:
            try:
                self.client = genai.Client(
                    vertexai=True,
                    project=os.getenv("GOOGLE_CLOUD_PROJECT", "app-reformia"),
                    location="europe-southwest1"
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
            "Our focus in this phase is to capture structured data to start a refurbishment project. "
            "A floor plan sheet can contain multiple dwellings/apartments (viviendas). You MUST identify each distinct "
            "housing unit/dwelling (e.g. 'Vivienda Tipo A', 'Vivienda Tipo B') and group the rooms and areas for each unit.\n\n"
            
            "For each distinct dwelling, extract:\n"
            "1. Name and total area in m².\n"
            "2. Estancias (rooms) aggregated by category ('cocina', 'baño', 'pasillo', 'dormitorio', 'salón'). Sum their areas and perimeters.\n"
            "3. Estimation of internal partition walls in linear meters (ml) and exterior facade walls in ml.\n\n"
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
        Feeds raw CAD coordinates and texts to Gemini 3.5 Flash to clean noise, match rooms semantically, 
        and output a perfect high-fidelity ExtractedPlan.
        """
        if not self.client:
            raise RuntimeError("Gemini client is not initialized.")

        prompt = (
            "You are an expert architect, quantity surveyor, and cost estimator. We have extracted raw vector data, "
            "line lengths per layer, and text annotations from an architectural CAD (DXF/DWG) floor plan.\n\n"
            
            "Our focus in this phase is to capture structured data to start a refurbishment project.\n\n"
            
            "### CRITICAL UNDERSTANDING:\n"
            "A floor plan sheet can contain multiple distinct dwellings/apartments (viviendas) on a single floor. "
            "You MUST cluster the extracted rooms, texts, and line lengths into their respective distinct housing units (Dwellings/Viviendas). "
            "For example, if you see annotations like 'S.U. viv. 1: 59.80 m2' and 'S.U. viv. 2: 101.09 m2', these are two separate apartments! "
            "Group the rooms, bathrooms, and corridors belonging to each apartment separately under its own 'Dwelling' object.\n\n"
            
            "### RULES:\n"
            "1. **Identify Real Dwellings**: Cluster rooms and texts into distinct housing units. Name them clearly (e.g., 'Vivienda Tipo A - 59.80m²', 'Vivienda Tipo B - 101.09m²').\n"
            "2. **Group Estancias by Category**: Inside each dwelling, aggregate all room areas (m2) and perimeters (ml) by their type/category: "
            "'cocina', 'baño', 'pasillo', 'dormitorio', 'salón'. For example, if a dwelling has 3 bedrooms, return a single 'dormitorio' category with "
            "count=3, and the sum of their areas and perimeters. Do NOT output raw coordinate tags or duplicate items!\n"
            "3. **Estimate Partition Walls (ml)**: Look at the `layer_line_lengths_meters` in raw data. "
            "For layers representing partitions (like 'Tabiques', 'Paredes', 'Partition', 'Muros_Interiores'), calculate the linear meters (ml) of partition walls. "
            "Because lines in CAD are drawn on both sides of a wall, divide the line lengths by 2. Distribute the total partition walls reasonably between the dwellings "
            "based on their size (e.g. approx 0.8 to 1.2 ml of partition wall per m² of dwelling area).\n"
            "4. **CRITICAL: Noise Filtering**: You MUST completely ignore and filter out all drawing metadata, title blocks, layout notes, dates, "
            "and company text annotations. For example, DO NOT generate dwellings or rooms for: 'VERSO ESPACIO RESIDENCIAL S.L.', "
            "'ENERO 2022', 'CALLE GENERAL ELORZA', 'PLANTA TIPO', 'LEVANTAMIENTO DE EDIFICIO...', 'Phase 1', 'ESTADO ACTUAL', "
            "or scale indicators. These are not parts of a home!\n\n"
            
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
