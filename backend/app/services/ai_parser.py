import os
from google import genai
from google.genai import types
from app.models.plan import ExtractedPlan

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "application/pdf"
}

# The new google-genai SDK
try:
    client = genai.Client()
except Exception as e:
    print(f"Warning: Failed to initialize genai client: {e}")
    client = None

class AIParsingService:
    def __init__(self):
        # Depending on the type of account and models available
        self.model_id = 'gemini-2.5-flash' # The current modern multimodal model

    def parse_blueprint(self, gcs_uri: str, mime_type: str) -> ExtractedPlan:
        """
        Parses a blueprint (image or pdf) from a GCS URI using Gemini and returns structured data.
        """
        if mime_type not in ALLOWED_MIME_TYPES:
            raise ValueError(f"Unsupported mime type for Gemini parsing: {mime_type}")
        
        if not client:
            raise RuntimeError("Gemini client is not initialized.")

        prompt = (
            "You are an expert architect and cost estimator. Carefully analyze the provided floor plan, blueprint, or room image. "
            "Extract all the rooms visible. For each room, estimate or extract the dimensions (length, width, height) in meters. "
            "Also extract any mentioned or visibly obvious materials for floors, walls, ceilings, and windows. "
            "Respond strictly with a structured JSON matching the provided schema."
        )

        file_part = types.Part.from_uri(file_uri=gcs_uri, mime_type=mime_type)

        response = client.models.generate_content(
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
