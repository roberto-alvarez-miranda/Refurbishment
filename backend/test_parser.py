import sys
from unittest.mock import MagicMock
# Mock GCP imports
sys.modules['google.cloud.bigquery'] = MagicMock()
sys.modules['google.cloud.storage'] = MagicMock()
sys.modules['google.cloud.firestore'] = MagicMock()
sys.modules['google.cloud'] = MagicMock()

from app.services.ai_parser import AIParsingService
from app.models.plan import ExtractedPlan, Room, MaterialAnnotation

def main():
    print("--- Testing AIParsingService initialization ---")
    parser = AIParsingService()
    print(f"Model ID set to: {parser.model_id}")
    
    print("\n--- Simulating a parsed response ---")
    # Simulate parsed Pydantic object returned by the new SDK
    plan = ExtractedPlan(
        rooms=[
            Room(
                name="Kitchen",
                length=4.5,
                width=3.0,
                height=2.5,
                materials=[MaterialAnnotation(type="floor", name="Ceramic Tile", confidence=0.85)]
            )
        ],
        general_notes="Test output from Gemini."
    )
    
    print(plan.model_dump_json(indent=2))

if __name__ == "__main__":
    main()
