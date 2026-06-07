import sys
from unittest.mock import MagicMock, patch

# Mock GCP imports
sys.modules['google.cloud.bigquery'] = MagicMock()
sys.modules['google.cloud.storage'] = MagicMock()
sys.modules['google.cloud.firestore'] = MagicMock()
sys.modules['google.cloud'] = MagicMock()

import pytest
from app.services.ai_parser import AIParsingService
from app.models.plan import ExtractedPlan, Dwelling, EstanciaSummary

@patch("app.services.ai_parser.AIParsingService._download_gcs_file")
@patch("app.services.ai_parser.CADParser.extract_raw_cad_data")
@patch("app.services.ai_parser.AIParsingService._synthesize_cad_data_with_gemini")
def test_parse_blueprint_routing_dxf(mock_synth, mock_extract, mock_download):
    # Setup mock returns
    mock_plan = ExtractedPlan(
        dwellings=[
            Dwelling(
                name="Vivienda A",
                total_area_m2=59.8,
                estancias=[EstanciaSummary(type="cocina", area_m2=10.5, perimeter_m=12.0, partition_walls_ml=8.5)],
                exterior_walls_ml=22.0
            )
        ],
        general_notes="DXF extracted notes"
    )
    mock_synth.return_value = mock_plan
    mock_extract.return_value = {"unit": "Millimeters", "closed_boundaries": [], "text_annotations": []}
    
    parser = AIParsingService()
    
    # Run parsing on .dxf
    result = parser.parse_blueprint("gs://my-bucket/plan.dxf", "application/dxf")
    
    assert result.dwellings[0].name == "Vivienda A"
    mock_download.assert_called_once()
    mock_extract.assert_called_once()
    mock_synth.assert_called_once()

@patch("app.services.ai_parser.AIParsingService._download_gcs_file")
@patch("app.services.ai_parser.CADParser.convert_dwg_to_dxf")
@patch("app.services.ai_parser.CADParser.extract_raw_cad_data")
@patch("app.services.ai_parser.AIParsingService._synthesize_cad_data_with_gemini")
def test_parse_blueprint_routing_dwg(mock_synth, mock_extract, mock_convert, mock_download):
    # Setup mock returns
    mock_convert.return_value = True
    mock_plan = ExtractedPlan(
        dwellings=[
            Dwelling(
                name="Vivienda B",
                total_area_m2=101.0,
                estancias=[EstanciaSummary(type="salón", area_m2=22.5, perimeter_m=18.0, partition_walls_ml=12.0)],
                exterior_walls_ml=35.0
            )
        ],
        general_notes="DWG extracted notes"
    )
    mock_synth.return_value = mock_plan
    mock_extract.return_value = {"unit": "Millimeters", "closed_boundaries": [], "text_annotations": []}
    
    parser = AIParsingService()
    
    # Run parsing on .dwg (should trigger convert_dwg_to_dxf first)
    result = parser.parse_blueprint("gs://my-bucket/plan.dwg", "application/x-dwg")
    
    assert result.dwellings[0].name == "Vivienda B"
    mock_download.assert_called_once()
    mock_convert.assert_called_once()
    mock_extract.assert_called_once()
    mock_synth.assert_called_once()
