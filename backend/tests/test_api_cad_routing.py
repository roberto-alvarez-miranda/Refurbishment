import sys
from unittest.mock import MagicMock, patch

# Mock GCP imports
sys.modules['google.cloud.bigquery'] = MagicMock()
sys.modules['google.cloud.storage'] = MagicMock()
sys.modules['google.cloud.firestore'] = MagicMock()
sys.modules['google.cloud'] = MagicMock()

import pytest
from app.services.ai_parser import AIParsingService
from app.models.plan import ExtractedPlan, Room

@patch("app.services.ai_parser.AIParsingService._download_gcs_file")
@patch("app.services.ai_parser.CADParser.parse_dxf")
def test_parse_blueprint_routing_dxf(mock_parse_dxf, mock_download):
    # Setup mock returns
    mock_plan = ExtractedPlan(
        rooms=[Room(name="DXF Room", length=5.0, width=4.0, height=2.5)],
        general_notes="DXF extracted notes"
    )
    mock_parse_dxf.return_value = mock_plan
    
    parser = AIParsingService()
    
    # Run parsing on .dxf
    result = parser.parse_blueprint("gs://my-bucket/plan.dxf", "application/dxf")
    
    assert result.rooms[0].name == "DXF Room"
    mock_download.assert_called_once()
    mock_parse_dxf.assert_called_once()

@patch("app.services.ai_parser.AIParsingService._download_gcs_file")
@patch("app.services.ai_parser.CADParser.convert_dwg_to_dxf")
@patch("app.services.ai_parser.CADParser.parse_dxf")
def test_parse_blueprint_routing_dwg(mock_parse_dxf, mock_convert, mock_download):
    # Setup mock returns
    mock_convert.return_value = True
    mock_plan = ExtractedPlan(
        rooms=[Room(name="DWG Room", length=6.0, width=5.0, height=2.5)],
        general_notes="DWG extracted notes"
    )
    mock_parse_dxf.return_value = mock_plan
    
    parser = AIParsingService()
    
    # Run parsing on .dwg (should trigger convert_dwg_to_dxf first)
    result = parser.parse_blueprint("gs://my-bucket/plan.dwg", "application/x-dwg")
    
    assert result.rooms[0].name == "DWG Room"
    mock_download.assert_called_once()
    mock_convert.assert_called_once()
    mock_parse_dxf.assert_called_once()
