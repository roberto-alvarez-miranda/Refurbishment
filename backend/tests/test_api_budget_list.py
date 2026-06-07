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

@patch("app.api.budget.firestore")
def test_list_budget_items_endpoint(mock_firestore):
    # Mock firestore client and docs stream
    mock_db = MagicMock()
    mock_firestore.Client.return_value = mock_db
    
    mock_doc = MagicMock()
    mock_doc.to_dict.return_value = {
        "code": "REV-001",
        "description": "Pavimentado en cocina",
        "qty": 12.5,
        "unit": "m²",
        "status": "Validado",
        "category": "Revestimientos"
    }
    mock_db.collection.return_value.stream.return_value = [mock_doc]
    
    response = client.get("/api/budget/list")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["code"] == "REV-001"
    assert data[0]["qty"] == 12.5
