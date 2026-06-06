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
from app.models.plan import ExtractedPlan, Room

client = TestClient(app)

@patch("app.dependencies.auth.auth.verify_id_token")
@patch("app.api.ai.AIParsingService")
def test_preview_blueprint_endpoint(mock_ai_service_class, mock_verify):
    mock_verify.return_value = {"uid": "testuser"}
    # Setup mock parser instance
    mock_parser = MagicMock()
    mock_plan = ExtractedPlan(
        rooms=[Room(name="Mocked Room", length=4.0, width=3.0, height=2.5)],
        general_notes="Mocked notes"
    )
    mock_parser.parse_blueprint.return_value = mock_plan
    mock_ai_service_class.return_value = mock_parser

    payload = {
        "gcs_uri": "gs://my-bucket/plan.pdf",
        "mime_type": "application/pdf"
    }

    response = client.post(
        "/api/ai/preview", 
        json=payload,
        headers={"Authorization": "Bearer fake_token"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "rooms" in data
    assert len(data["rooms"]) == 1
    assert data["rooms"][0]["name"] == "Mocked Room"
    
    # Verify the service was called correctly
    mock_parser.parse_blueprint.assert_called_once_with(
        "gs://my-bucket/plan.pdf", "application/pdf"
    )
