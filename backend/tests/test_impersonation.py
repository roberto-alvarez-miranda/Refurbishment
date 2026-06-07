import os
import sys
from unittest.mock import MagicMock, patch

# Mock GCP imports
sys.modules['google.cloud.bigquery'] = MagicMock()
sys.modules['google.cloud.storage'] = MagicMock()
sys.modules['google.cloud.firestore'] = MagicMock()

import pytest
from app.services.ai_parser import AIParsingService

@patch("app.services.ai_parser.google.auth.default")
@patch("app.services.ai_parser.ImpersonatedCredentials")
@patch("app.services.ai_parser.genai.Client")
def test_ai_parser_impersonation(mock_genai_client, mock_impersonated_creds, mock_auth_default):
    # Setup the mock base credentials
    mock_source_creds = MagicMock()
    mock_auth_default.return_value = (mock_source_creds, "dummy-project")
    
    # Setup mock impersonated credentials
    mock_impersonated = MagicMock()
    mock_impersonated_creds.return_value = mock_impersonated

    # A user payload containing the custom claim for their dedicated SA
    user = {
        "uid": "testuser123",
        "service_account_email": "user-testuser123@app-reformia.iam.gserviceaccount.com"
    }

    # Initialize the parser with the user
    parser = AIParsingService(user=user)

    # Verify that ImpersonatedCredentials was called correctly
    mock_impersonated_creds.assert_called_once_with(
        source_credentials=mock_source_creds,
        target_principal="user-testuser123@app-reformia.iam.gserviceaccount.com",
        target_scopes=["https://www.googleapis.com/auth/cloud-platform"],
        lifetime=3600
    )

    # Verify that the genai client was initialized with Vertex AI and the impersonated credentials
    expected_project = os.getenv("GOOGLE_CLOUD_PROJECT", "app-reformia")
    mock_genai_client.assert_called_once_with(
        vertexai=True,
        project=expected_project,
        location="us-central1",
        credentials=mock_impersonated
    )

def test_ai_parser_impersonation_missing_claim():
    # If the user doesn't have the claim, it should raise an error
    user = {"uid": "testuser123"}
    with pytest.raises(ValueError, match="Missing service_account_email claim in user token"):
        AIParsingService(user=user)
