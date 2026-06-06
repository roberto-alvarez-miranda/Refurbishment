import os
import sys

# Set up path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_test():
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
    print(f"Response status: {response.status_code}")
    print(f"Response JSON: {response.json()}")
    
    # Verify it actually wrote to the emulator
    from google.cloud import firestore
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "app-reformia")
    db = firestore.Client(project=project_id, database="(default)")
    docs = list(db.collection("budget_components").stream())
    print(f"Saved documents count: {len(docs)}")
    for doc in docs:
        print(f"Doc: {doc.to_dict()}")

if __name__ == '__main__':
    run_test()
