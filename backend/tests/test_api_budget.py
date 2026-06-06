import sys
from unittest.mock import MagicMock

# Mock Google Cloud imports to avoid Python 3.14 protobuf incompatibilities in tests
sys.modules['google.cloud.bigquery'] = MagicMock()
sys.modules['google.cloud.storage'] = MagicMock()
sys.modules['google.cloud.firestore'] = MagicMock()
sys.modules['google.cloud'] = MagicMock()

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_calculate_budget_endpoint():
    payload = {
        "budget": {
            "id": "proj-01",
            "name": "My Renovation Project",
            "parameters": {},
            "total_cost": 0.0
        },
        "chapters": [
            {
                "id": "c-01",
                "project_id": "proj-01",
                "code": "C01",
                "name": "Demolition",
                "total_cost": 0.0
            }
        ],
        "items": [
            {
                "id": "item-01",
                "chapter_id": "c-01",
                "project_id": "proj-01",
                "code": "DEM-01",
                "name": "Demolish wall",
                "unit_type": "m2",
                "resources": [
                    {"resource_id": "r-01", "quantity": 2.0} # 2 hours * 20 = 40
                ],
                "measurement_lines": [
                    {"id": "m-01", "length": 5.0, "height": 3.0, "units": 1.0, "width": 1.0} # 15 m2
                ],
                "calculated_unit_price": 0.0,
                "calculated_quantity": 0.0
            }
        ],
        "resources": {
            "r-01": {
                "id": "r-01",
                "project_id": "proj-01",
                "code": "MO",
                "name": "Labor",
                "resource_type": "labor",
                "base_price": 20.0
            }
        }
    }

    response = client.post("/api/budget/calculate", json=payload)
    assert response.status_code == 200
    
    data = response.json()
    assert "budget" in data
    assert "chapters" in data
    assert "items" in data

    # 40 (unit price) * 15 (quantity) = 600
    assert data["items"][0]["calculated_unit_price"] == 40.0
    assert data["items"][0]["calculated_quantity"] == 15.0
    assert data["items"][0]["total_cost"] == 600.0
    
    assert data["chapters"][0]["total_cost"] == 600.0
    assert data["budget"]["total_cost"] == 600.0
