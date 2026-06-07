import sys
from unittest.mock import MagicMock, patch

# Mock GCP imports
sys.modules['google.cloud.bigquery'] = MagicMock()
sys.modules['google.cloud.storage'] = MagicMock()
sys.modules['google.cloud.firestore'] = MagicMock()
sys.modules['google.cloud'] = MagicMock()

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.plan import ExtractedPlan, Dwelling, EstanciaSummary

client = TestClient(app)

@patch("app.dependencies.auth.auth.verify_id_token")
@patch("app.api.ai.AIParsingService")
def test_chat_with_plan_endpoint(mock_ai_service_class, mock_verify):
    mock_verify.return_value = {"uid": "user123"}
    
    # Setup mock parser instance
    mock_parser = MagicMock()
    mock_parser.chat_with_context.return_value = "This is a mock answer about your floor plan."
    mock_ai_service_class.return_value = mock_parser

    payload = {
        "message": "What is the total area?",
        "plan_context": {
            "dwellings": [
                {
                    "name": "Vivienda A",
                    "total_area_m2": 65.0,
                    "estancias": [
                        {
                            "type": "cocina",
                            "name": "Cocina",
                            "area_m2": 10.0,
                            "perimeter_m": 12.0,
                            "partition_walls_ml": 8.5,
                            "proposed_materials": []
                        }
                    ],
                    "exterior_walls_ml": 15.0
                }
            ],
            "general_notes": "test notes"
        }
    }

    response = client.post(
        "/api/ai/chat", 
        json=payload,
        headers={"Authorization": "Bearer fake_token"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["response"] == "This is a mock answer about your floor plan."
    mock_parser.chat_with_context.assert_called_once()
