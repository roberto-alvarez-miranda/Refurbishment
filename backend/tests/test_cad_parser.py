import pytest
from unittest.mock import MagicMock, patch
from app.services.cad_parser import CADParser

def test_get_scale_factor():
    # 1. Test Millimeters (insunits = 4)
    doc_mm = MagicMock()
    doc_mm.header.get.side_effect = lambda var, default: 4 if var == '$INSUNITS' else 1.0
    factor_mm = CADParser.get_scale_factor(doc_mm)
    assert factor_mm == 0.001  # 1 mm = 0.001 m

    # 2. Test Meters (insunits = 6)
    doc_m = MagicMock()
    doc_m.header.get.side_effect = lambda var, default: 6 if var == '$INSUNITS' else 1.0
    factor_m = CADParser.get_scale_factor(doc_m)
    assert factor_m == 1.0  # 1 m = 1.0 m

    # 3. Test Unspecified / Fallback (insunits = 0)
    doc_unspec = MagicMock()
    doc_unspec.header.get.side_effect = lambda var, default: 0 if var == '$INSUNITS' else 1.0
    factor_unspec = CADParser.get_scale_factor(doc_unspec)
    assert factor_unspec == 0.001  # Fallback to mm

def test_calculate_polyline_area_and_perimeter():
    # Define a 10x10 square in CAD units
    points = [
        (0.0, 0.0),
        (10.0, 0.0),
        (10.0, 10.0),
        (0.0, 10.0)
    ]
    
    # Scale factor is 1.0 (meters)
    area, perimeter = CADParser.calculate_polyline_area_and_perimeter(points, 1.0)
    assert area == 100.0       # 10 * 10 = 100 m2
    assert perimeter == 40.0   # 10 * 4 = 40 ml

    # Scale factor is 0.1 (decimeters to meters)
    area_dm, perimeter_dm = CADParser.calculate_polyline_area_and_perimeter(points, 0.1)
    assert area_dm == 1.0      # 1 * 1 = 1 m2
    assert perimeter_dm == 4.0 # 1 * 4 = 4 ml

@patch("subprocess.run")
def test_convert_dwg_to_dxf(mock_run):
    # Mock subprocess.run success
    mock_run.return_value = MagicMock(returncode=0)
    
    with patch("os.path.exists", return_value=True):
        success = CADParser.convert_dwg_to_dxf("test.dwg", "test.dxf")
        assert success is True
        mock_run.assert_called_once_with(
            ["dwg2dxf", "-o", "test.dxf", "test.dwg"],
            capture_output=True,
            text=True,
            check=True
        )
