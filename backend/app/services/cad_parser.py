import os
import subprocess
import logging
import re
import ezdxf
from typing import List, Tuple, Dict, Any

logger = logging.getLogger(__name__)

# Mapeo de unidades de inserción de AutoCAD ($INSUNITS)
UNIDADES_MAP = {
    0: "Unspecified",
    1: "Inches",
    2: "Feet",
    3: "Miles",
    4: "Millimeters",
    5: "Centimeters",
    6: "Meters",
    7: "Kilometers",
}

class CADParser:
    @staticmethod
    def convert_dwg_to_dxf(dwg_path: str, dxf_path: str) -> bool:
        """
        Converts a binary .dwg file to an ASCII .dxf file using the dwg2dxf CLI tool.
        """
        if not os.path.exists(dwg_path):
            logger.error(f"DWG file not found: {dwg_path}")
            return False
            
        try:
            logger.info(f"Running conversion: dwg2dxf -o {dxf_path} {dwg_path}")
            result = subprocess.run(
                ["dwg2dxf", "-o", dxf_path, dwg_path],
                capture_output=True,
                text=True,
                check=True
            )
            logger.info("DWG to DXF conversion successful.")
            return os.path.exists(dxf_path)
        except subprocess.CalledProcessError as e:
            logger.error(f"dwg2dxf failed: {e.stderr}")
            return False
        except FileNotFoundError:
            logger.error("dwg2dxf CLI utility is not installed or not in PATH.")
            return False
        except Exception as e:
            logger.error(f"Unexpected error during DWG conversion: {e}")
            return False

    @staticmethod
    def get_scale_factor(doc: ezdxf.document.Drawing) -> Tuple[float, int]:
        """
        Extracts units and linear scaling from drawing headers and returns the multiplier to convert CAD units to meters.
        """
        insunits = doc.header.get('$INSUNITS', 0)
        logger.info(f"CAD Header $INSUNITS detected: {insunits} ({UNIDADES_MAP.get(insunits, 'Unknown')})")

        if insunits == 1:   # Inches to Meters
            unit_to_meters = 0.0254
        elif insunits == 2: # Feet to Meters
            unit_to_meters = 0.3048
        elif insunits == 4: # Millimeters to Meters
            unit_to_meters = 0.001
        elif insunits == 5: # Centimeters to Meters
            unit_to_meters = 0.01
        elif insunits == 6: # Meters to Meters
            unit_to_meters = 1.0
        else:
            logger.warning("No units specified in CAD header ($INSUNITS = 0). Defaulting to Millimeters.")
            unit_to_meters = 0.001

        return unit_to_meters, insunits

    @staticmethod
    def calculate_polyline_area_and_perimeter(points: List[Tuple[float, float]], factor: float) -> Tuple[float, float]:
        """
        Calculates the real area (m2) and perimeter (ml) of a closed polyline in meters.
        Uses Shoelace formula for area.
        """
        n = len(points)
        if n < 3:
            return 0.0, 0.0
            
        scaled_points = [(p[0] * factor, p[1] * factor) for p in points]
        
        # Area using Shoelace formula
        area = 0.0
        for i in range(n):
            j = (i + 1) % n
            area += scaled_points[i][0] * scaled_points[j][1]
            area -= scaled_points[j][0] * scaled_points[i][1]
        area = abs(area) / 2.0
        
        # Perimeter
        perimeter = 0.0
        for i in range(n):
            j = (i + 1) % n
            dx = scaled_points[j][0] - scaled_points[i][0]
            dy = scaled_points[j][1] - scaled_points[i][1]
            perimeter += (dx**2 + dy**2) ** 0.5
            
        return area, perimeter

    @classmethod
    def extract_raw_cad_data(cls, dxf_path: str) -> Dict[str, Any]:
        """
        Extracts raw geometry scale, closed areas/perimeters, line segments (grouped by layer), and text elements.
        This provides high-precision coordinates and labels to be semantically digested by Gemini.
        """
        if not os.path.exists(dxf_path):
            raise FileNotFoundError(f"DXF file not found: {dxf_path}")

        doc = ezdxf.readfile(dxf_path)
        msp = doc.modelspace()
        
        # 1. Scale
        factor, insunits = cls.get_scale_factor(doc)
        
        # 2. Extract closed polylines (mathematical room boundaries)
        polylines = []
        poly_count = 1
        for poly in msp.query('LWPOLYLINE'):
            if poly.is_closed:
                points = [(p[0], p[1]) for p in poly.get_points()]
                area, perimeter = cls.calculate_polyline_area_and_perimeter(points, factor)
                if area > 0.05: # Ignore tiny artifacts
                    xs = [p[0] for p in points]
                    ys = [p[1] for p in points]
                    polylines.append({
                        "id": f"POLY-{poly_count}",
                        "area_m2": round(area, 2),
                        "perimeter_m": round(perimeter, 2),
                        "bbox": {
                            "min_x": round(min(xs), 2),
                            "max_x": round(max(xs), 2),
                            "min_y": round(min(ys), 2),
                            "max_y": round(max(ys), 2)
                        }
                    })
                    poly_count += 1

        # 3. Extract text labels with clean content and position
        texts = []
        for text in msp.query('MTEXT TEXT'):
            content = text.dxf.text.strip()
            # Clean AutoCAD MTEXT formatting codes (e.g. \A1; or \H0.7x;)
            content = re.sub(r"\\[A-Za-z0-9\.]+;", "", content)
            content = re.sub(r"[{}\[\]]", "", content)
            
            if len(content) > 1 and not content.startswith("\\"):
                texts.append({
                    "text": content,
                    "x": round(text.dxf.insert.x, 2),
                    "y": round(text.dxf.insert.y, 2),
                    "layer": text.dxf.layer
                })

        # 4. Extract total lengths of all lines grouped by layer (for wall partition estimations)
        layer_lengths = {}
        for line in msp.query('LINE'):
            layer = line.dxf.layer
            dx = line.dxf.end.x - line.dxf.start.x
            dy = line.dxf.end.y - line.dxf.start.y
            length = (dx**2 + dy**2) ** 0.5 * factor
            layer_lengths[layer] = round(layer_lengths.get(layer, 0.0) + length, 2)

        return {
            "unit": UNIDADES_MAP.get(insunits, "Unspecified"),
            "scale_factor_to_meters": factor,
            "closed_boundaries": polylines,
            "text_annotations": texts,
            "layer_line_lengths_meters": layer_lengths
        }
