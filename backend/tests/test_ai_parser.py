import pytest
from unittest.mock import MagicMock, patch
import app.services.ai_parser
from app.services.ai_parser import AIParsingService
from app.models.plan import ExtractedPlan, Dwelling, EstanciaSummary

@patch("app.services.ai_parser.genai.Client")
def test_parse_blueprint(mock_genai_client_class):
    # Setup mock client
    mock_client = MagicMock()
    mock_genai_client_class.return_value = mock_client
    
    # Setup mock response
    mock_response = MagicMock()
    # Pydantic parses the generated response, so we mock the parsed object
    mock_response.parsed = ExtractedPlan(
        dwellings=[
            Dwelling(
                name="Living Room",
                total_area_m2=20.0,
                estancias=[EstanciaSummary(type="salón", area_m2=20.0, perimeter_m=18.0, partition_walls_ml=15.0)],
                exterior_walls_ml=12.0
            )
        ],
        general_notes="Standard apartment plan"
    )
    mock_client.models.generate_content.return_value = mock_response

    # Test the service
    parser = AIParsingService()
    assert parser.model_id == "gemini-3.1-pro-preview"
    
    result = parser.parse_blueprint("gs://my-bucket/plan.pdf", "application/pdf")
    
    assert result.dwellings[0].name == "Living Room"
    assert result.dwellings[0].total_area_m2 == 20.0
    assert result.dwellings[0].estancias[0].type == "salón"

def test_parse_blueprint_unsupported_type():
    parser = AIParsingService()
    with pytest.raises(ValueError, match="Unsupported mime type"):
        parser.parse_blueprint("gs://my-bucket/malicious.sh", "application/x-sh")
