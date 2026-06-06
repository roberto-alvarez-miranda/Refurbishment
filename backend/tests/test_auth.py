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

client = TestClient(app)

def test_auth_middleware_blocks_unauthorized():
    app.dependency_overrides = {}
    # Test unauthorized preview
    response = client.post("/api/ai/preview", json={"gcs_uri": "gs://b/file.pdf", "mime_type": "application/pdf"})
    assert response.status_code == 403

    # Test unauthorized upload
    response = client.post(
        "/upload-asset",
        files={"file": ("plan.pdf", b"dummy content", "application/pdf")}
    )
    assert response.status_code == 403

@patch("app.dependencies.auth.auth.verify_id_token")
@patch("app.main.storage_client")
def test_upload_valid_file_with_auth(mock_storage_client, mock_verify):
    # Mock valid token
    mock_verify.return_value = {"uid": "user123"}

    mock_bucket = MagicMock()
    mock_blob = MagicMock()
    mock_storage_client.bucket.return_value = mock_bucket
    mock_bucket.blob.return_value = mock_blob

    # Test PDF with auth
    response = client.post(
        "/upload-asset",
        files={"file": ("plan.pdf", b"dummy content", "application/pdf")},
        headers={"Authorization": "Bearer fake_token"}
    )
    assert response.status_code == 200
    assert response.json()["filename"] == "plan.pdf"
    
from app.models.plan import ExtractedPlan, Room

@patch("app.dependencies.auth.auth.verify_id_token")
@patch("app.api.ai.AIParsingService")
def test_preview_blueprint_endpoint_with_auth(mock_ai_service_class, mock_verify):
    mock_verify.return_value = {"uid": "user123"}
    
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
