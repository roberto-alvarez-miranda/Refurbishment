import pytest
from unittest.mock import MagicMock, patch
import app.services.ai_parser
from app.services.ai_parser import AIParsingService
from app.models.plan import ExtractedPlan, Room, MaterialAnnotation

@patch("app.services.ai_parser.client")
def test_parse_blueprint(mock_client):
    # Setup mock response
    mock_response = MagicMock()
    # Pydantic parses the generated response, so we mock the parsed object
    mock_response.parsed = ExtractedPlan(
        rooms=[
            Room(
                name="Living Room",
                length=5.0,
                width=4.0,
                height=2.5,
                materials=[MaterialAnnotation(type="floor", name="Oak Wood", confidence=0.9)]
            )
        ],
        general_notes="Standard apartment plan"
    )
    mock_client.models.generate_content.return_value = mock_response

    # Test the service
    parser = AIParsingService()
    # Need to manually inject the mock client since the module level one was None
    app.services.ai_parser.client = mock_client
    
    result = parser.parse_blueprint("gs://my-bucket/plan.pdf", "application/pdf")
    
    assert result.rooms[0].name == "Living Room"
    assert result.rooms[0].length == 5.0
    assert result.rooms[0].materials[0].name == "Oak Wood"

def test_parse_blueprint_unsupported_type():
    parser = AIParsingService()
    with pytest.raises(ValueError, match="Unsupported mime type"):
        parser.parse_blueprint("gs://my-bucket/malicious.sh", "application/x-sh")
