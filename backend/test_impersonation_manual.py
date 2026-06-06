import sys
from unittest.mock import MagicMock, patch

# Mock GCP imports
sys.modules['google.cloud.bigquery'] = MagicMock()
sys.modules['google.cloud.storage'] = MagicMock()
sys.modules['google.cloud.firestore'] = MagicMock()

from app.services.ai_parser import AIParsingService

@patch("app.services.ai_parser.google.auth.default")
@patch("app.services.ai_parser.ImpersonatedCredentials")
@patch("app.services.ai_parser.genai.Client")
def main(mock_genai_client, mock_impersonated_creds, mock_auth_default):
    print("--- Testing Dynamic Impersonation ---")
    mock_source_creds = MagicMock()
    mock_auth_default.return_value = (mock_source_creds, "dummy-project")
    mock_impersonated = MagicMock()
    mock_impersonated_creds.return_value = mock_impersonated

    # Mock user token payload
    user = {
        "uid": "testuser123",
        "service_account_email": "user-testuser123@app-reformia.iam.gserviceaccount.com"
    }
    
    print(f"Initializing AIParsingService with user context: {user['service_account_email']}")
    parser = AIParsingService(user=user)

    # Verify that ImpersonatedCredentials was called correctly
    try:
        mock_impersonated_creds.assert_called_once_with(
            source_credentials=mock_source_creds,
            target_principal=user["service_account_email"],
            target_scopes=["https://www.googleapis.com/auth/cloud-platform"],
            lifetime=3600
        )
        print("Success: ImpersonatedCredentials initialized with the correct target_principal!")
    except AssertionError as e:
        print(f"Error: ImpersonatedCredentials was not called correctly. {e}")

    try:
        # Verify that the genai client was initialized with Vertex AI
        mock_genai_client.assert_called_once_with(
            vertexai=True,
            project="app-reformia",
            location="europe-southwest1",
            credentials=mock_impersonated
        )
        print("Success: genai.Client initialized with vertexai=True and impersonated credentials!")
    except AssertionError as e:
        print(f"Error: genai.Client was not called correctly. {e}")

if __name__ == "__main__":
    main()
