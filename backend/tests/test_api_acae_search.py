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

@patch("app.dependencies.auth.auth.verify_id_token")
@patch("app.services.acae_search.bigquery.Client")
def test_acae_search_endpoint(mock_bq_client_class, mock_verify):
    mock_verify.return_value = {"uid": "user123"}
    
    # Setup mock BigQuery client and query results
    mock_bq_client = MagicMock()
    mock_job = MagicMock()
    mock_row = MagicMock()
    mock_row.code = "ISOPOP"
    mock_row.description = "PLADUR ENAIRGY ISOPOP"
    mock_row.unit = "ud"
    mock_row.source = "ACAE"
    
    mock_job.result.return_value = [mock_row]
    mock_bq_client.query.return_value = mock_job
    mock_bq_client_class.return_value = mock_bq_client
    
    response = client.get(
        "/api/ai/acae-search?q=pladur",
        headers={"Authorization": "Bearer fake_token"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert len(data["results"]) == 1
    assert data["results"][0]["code"] == "ISOPOP"

@patch("app.services.acae_search.bigquery.Client")
def test_search_acae_service_direct(mock_bq_client_class):
    """
    Directly tests the search_acae service function logic.
    """
    from app.services.acae_search import search_acae
    
    mock_bq_client = MagicMock()
    mock_job = MagicMock()
    mock_row = MagicMock()
    mock_row.code = "EQBDA___IDE1141"
    mock_row.description = "Inodoro de porcelana vitrificada"
    mock_row.unit = "ud"
    mock_row.source = "ACAE"
    
    mock_job.result.return_value = [mock_row]
    mock_bq_client.query.return_value = mock_job
    mock_bq_client_class.return_value = mock_bq_client
    
    # Test valid query
    results = search_acae("inodoro")
    assert len(results) == 1
    assert results[0]["code"] == "EQBDA___IDE1141"
    assert results[0]["description"] == "Inodoro de porcelana vitrificada"

@patch("app.services.acae_search.bigquery.Client")
def test_search_acae_service_error_handling(mock_bq_client_class):
    """
    Verifies that search_acae handles database connection errors gracefully by returning [].
    """
    from app.services.acae_search import search_acae
    
    # Force query to raise an exception
    mock_bq_client = MagicMock()
    mock_bq_client.query.side_effect = Exception("BigQuery connection timeout")
    mock_bq_client_class.return_value = mock_bq_client
    
    results = search_acae("ladrillo")
    assert results == [] # Gracefully handled and returned empty list

