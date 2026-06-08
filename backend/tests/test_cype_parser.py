import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# Mock BC3 file content for test stability
MOCK_BC3_DATA = """
~C|DPT010_1_0_0_0_0_0|m2|18.50|Demolición de partición interior de fábrica de ladrillo cerámico, de hasta 10 cm de espesor|
~C|REV010_1_0_0_0_0_0|m2|24.20|Pavimento cerámico colocado con adhesivo|
"""

class MockResponse:
    def __init__(self, text, status_code):
        self.text = text
        self.content = text.encode("latin-1")
        self.status_code = status_code

def test_parse_bc3_format_string():
    """
    Tests direct FIEBDC-3 parser logic on a raw string block.
    """
    from app.services.cype_parser import parse_bc3_line
    
    # Test valid line parsing
    line = "~C|DPT010_1_0_0_0_0_0|m2|18.50|Demolición de partición interior...|"
    res = parse_bc3_line(line)
    assert res is not None
    assert res["code"] == "DPT010_1_0_0_0_0_0"
    assert res["unit"] == "m2"
    assert res["price"] == 18.50
    assert res["description"] == "Demolición de partición interior..."

def test_cype_lookup_endpoint_success(monkeypatch):
    """
    Tests that the GET /api/budget/cype-lookup endpoint correctly fetches,
    parses, and returns the requested item.
    """
    import httpx
    # Mock httpx.get using the native monkeypatch fixture
    def mock_get(*args, **kwargs):
        return MockResponse(MOCK_BC3_DATA, 200)
    
    monkeypatch.setattr(httpx, "get", mock_get)

    response = client.get("/api/budget/cype-lookup?code=DPT010_1_0_0_0_0_0&province=asturias")
    assert response.status_code == 200
    
    data = response.json()
    assert data["code"] == "DPT010_1_0_0_0_0_0"
    assert data["unit"] == "m2"
    assert data["price"] == 18.50
    assert "Demolición de partición interior" in data["description"]

def test_cype_lookup_endpoint_not_found(monkeypatch):
    """
    Tests endpoint error handling when a code is not in the BC3 file.
    """
    import httpx
    def mock_get(*args, **kwargs):
        return MockResponse(MOCK_BC3_DATA, 200)
    
    monkeypatch.setattr(httpx, "get", mock_get)

    response = client.get("/api/budget/cype-lookup?code=UNKNOWN_CODE&province=asturias")
    assert response.status_code == 404
    assert "no fue encontrada" in response.json()["detail"]
