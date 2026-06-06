import os
from google import genai
from google.genai import types
import google.auth
from google.auth.impersonated_credentials import Credentials as ImpersonatedCredentials
from app.models.plan import ExtractedPlan

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "application/pdf"
}

class AIParsingService:
    def __init__(self, user: dict = None):
        # Depending on the type of account and models available
        self.model_id = 'gemini-2.5-flash' # The current modern multimodal model
        
        # We allow client to be initialized dynamically based on the user's impersonation claim
        self.client = None
        if user:
            service_account_email = user.get("service_account_email")
            if not service_account_email:
                raise ValueError("Missing service_account_email claim in user token")
            
            try:
                # Get the default credentials (the backend's identity)
                source_creds, project_id = google.auth.default()
                
                # Create impersonated credentials
                impersonated_creds = ImpersonatedCredentials(
                    source_credentials=source_creds,
                    target_principal=service_account_email,
                    target_scopes=["https://www.googleapis.com/auth/cloud-platform"],
                    lifetime=3600
                )
                
                # Initialize Vertex AI client with these credentials
                self.client = genai.Client(
                    vertexai=True,
                    project=os.getenv("GOOGLE_CLOUD_PROJECT", "app-reformia"),
                    location="europe-southwest1",
                    credentials=impersonated_creds
                )
            except Exception as e:
                print(f"Warning: Failed to initialize genai client with impersonation: {e}")
        else:
            # Fallback for old tests or local testing without user context
            try:
                self.client = genai.Client()
            except Exception as e:
                print(f"Warning: Failed to initialize fallback genai client: {e}")

    def parse_blueprint(self, gcs_uri: str, mime_type: str) -> ExtractedPlan:
        """
        Parses a blueprint (image or pdf) from a GCS URI using Gemini and returns structured data.
        """
        if mime_type not in ALLOWED_MIME_TYPES:
            raise ValueError(f"Unsupported mime type for Gemini parsing: {mime_type}")
        
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
                temperature=0.0 # Deterministic output for parsing
            ),
        )

        # The new SDK parses the JSON automatically into the Pydantic object if specified
        return response.parsed
