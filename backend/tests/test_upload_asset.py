import sys
from unittest.mock import MagicMock, patch

# Mock Google Cloud imports to avoid Python 3.14 protobuf incompatibilities in tests
sys.modules['google.cloud.bigquery'] = MagicMock()
sys.modules['google.cloud.storage'] = MagicMock()
sys.modules['google.cloud.firestore'] = MagicMock()
sys.modules['google.cloud'] = MagicMock()

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@patch("app.main.storage_client")
def test_upload_valid_file(mock_storage_client):
    # Mock the GCS bucket upload
    mock_bucket = MagicMock()
    mock_blob = MagicMock()
    mock_storage_client.bucket.return_value = mock_bucket
    mock_bucket.blob.return_value = mock_blob

    # Test PDF
    response = client.post(
        "/upload-asset",
        files={"file": ("plan.pdf", b"dummy content", "application/pdf")}
    )
    assert response.status_code == 200
    assert response.json()["filename"] == "plan.pdf"

    # Test PNG
    response = client.post(
        "/upload-asset",
        files={"file": ("image.png", b"dummy content", "image/png")}
    )
    assert response.status_code == 200

    # Test DXF
    response = client.post(
        "/upload-asset",
        files={"file": ("drawing.dxf", b"dummy content", "application/dxf")}
    )
    assert response.status_code == 200

def test_upload_invalid_file():
    # Test Executable
    response = client.post(
        "/upload-asset",
        files={"file": ("script.sh", b"dummy content", "application/x-sh")}
    )
    assert response.status_code == 400
    assert "Invalid file type" in response.json()["detail"]

    # Test invalid extension with valid mime
    response = client.post(
        "/upload-asset",
        files={"file": ("malicious.exe", b"dummy content", "image/png")}
    )
    assert response.status_code == 400
