import sys
from unittest.mock import MagicMock

# Unmock Google Cloud modules if they were globally mocked by other unit tests during collection
for module_name in ['google.cloud.firestore', 'google.cloud.bigquery', 'google.cloud.storage', 'google.cloud']:
    if module_name in sys.modules and isinstance(sys.modules[module_name], MagicMock):
        del sys.modules[module_name]

import os
import pytest
from fastapi.testclient import TestClient
from app.main import app

# Ensure FIRESTORE_EMULATOR_HOST is set (it will be set by firebase-tools emulators:exec)
if not os.getenv("FIRESTORE_EMULATOR_HOST"):
    pytest.skip("Skipping integration tests: FIRESTORE_EMULATOR_HOST not set", allow_module_level=True)

client = TestClient(app)

def test_save_budget_integration():
    payload = {
        "items": [
            {
                "code": "DEM-001",
                "description": "Integration Test Demolition",
                "qty": 10.5,
                "unit": "m2",
                "status": "Validado",
                "category": "Demolición"
            }
        ]
    }
    
    response = client.post("/api/budget/save", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["saved_count"] == 1
    
    # Verify it actually wrote to the emulator
    from google.cloud import firestore
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "app-reformia")
    db = firestore.Client(project=project_id, database="(default)")
    docs = list(db.collection("budget_components").stream())
    assert len(docs) >= 1
    
    # Check that at least one doc matches
    match_found = False
    for doc in docs:
        d = doc.to_dict()
        if d.get("code") == "DEM-001" and d.get("description") == "Integration Test Demolition":
            match_found = True
            break
    assert match_found
