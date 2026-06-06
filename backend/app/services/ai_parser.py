import os
import tempfile
import logging
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
        self.model_id = 'gemini-2.5-flash'
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
        
        # Check if it is a CAD file (by checking GCS extension as MIME types can be generic application/octet-stream)
        lower_uri = gcs_uri.lower()
        is_dwg = lower_uri.endswith(".dwg") or mime_type == "application/x-dwg"
        is_dxf = lower_uri.endswith(".dxf") or mime_type in ["application/dxf", "image/vnd.dxf", "application/x-dxf"]

        if is_dwg or is_dxf:
            logger.info("CAD file detected. Routing to vector parser...")
            
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
                
                # 3. Parse the vector geometry
                return CADParser.parse_dxf(parse_target)

        # Fallback to Gemini Multimodal for images and PDFs
        logger.info("Multimodal document detected. Routing to Gemini AI model...")
        if not self.client:
            raise RuntimeError("Gemini client is not initialized.")

        prompt = (
            "You are an expert architect and cost estimator. Carefully analyze the provided floor plan, blueprint, or room image. "
            "Extract all the rooms visible. For each room, estimate or extract the dimensions (length, width, height) in meters. "
            "Also extract any mentioned or visibly obvious materials for floors, walls, ceilings, and windows. "
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
