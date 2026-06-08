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
def test_preview_blueprint_endpoint(mock_ai_service_class, mock_verify):
    mock_verify.return_value = {"uid": "testuser"}
    # Setup mock parser instance
    mock_parser = MagicMock()
    mock_plan = ExtractedPlan(
        dwellings=[
            Dwelling(
                name="Vivienda A",
                total_area_m2=65.0,
                estancias=[EstanciaSummary(type="cocina", area_m2=10.0, perimeter_m=12.0, partition_walls_ml=8.5)],
                exterior_walls_ml=15.0
            )
        ],
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
    assert "dwellings" in data
    assert len(data["dwellings"]) == 1
    assert data["dwellings"][0]["name"] == "Vivienda A"
    
    # Verify the service was called correctly
    mock_parser.parse_blueprint.assert_called_once_with(
        "gs://my-bucket/plan.pdf", "application/pdf"
    )

@patch("app.dependencies.auth.auth.verify_id_token")
def test_specify_material_endpoint_fallback(mock_verify):
    """
    Tests that /api/ai/specifier correctly resolves and utilizes the smart fallback
    when Google GenAI raises an exception (mocked client offline).
    """
    mock_verify.return_value = {"uid": "testuser"}
    
    # We don't mock genai, which will raise ImportError or exception, triggering fallback!
    payload = {"query": "Porcelánico Gran Formato Marazzi"}
    
    response = client.post(
        "/api/ai/specifier",
        json=payload,
        headers={"Authorization": "Bearer fake_token"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == "MAT-LUX-01"
    assert "Porcelánico gran formato" in data["description"]
    assert data["price"] == 75.00
    assert data["unit"] == "m2"
    assert "Sistemas de Estimación" in data["source"]

