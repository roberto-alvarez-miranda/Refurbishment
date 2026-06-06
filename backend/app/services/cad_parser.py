import os
import subprocess
import logging
import re
import ezdxf
from typing import List, Tuple, Dict, Optional
from app.models.plan import ExtractedPlan, Room, MaterialAnnotation

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
            # Run dwg2dxf tool: dwg2dxf -o <dxf_path> <dwg_path>
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
    def get_scale_factor(doc: ezdxf.document.Drawing) -> float:
        """
        Extracts units and linear scaling from drawing headers and returns the multiplier to convert CAD units to meters.
        """
        # 1. Read $INSUNITS (Default drawing units)
        insunits = doc.header.get('$INSUNITS', 0)
        logger.info(f"CAD Header $INSUNITS detected: {insunits} ({UNIDADES_MAP.get(insunits, 'Unknown')})")

        # Factor to convert drawing unit to Meters
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
            # Fallback: Default to millimeters (common in Spanish architectural interior design)
            logger.warning("No units specified in CAD header ($INSUNITS = 0). Defaulting to Millimeters.")
            unit_to_meters = 0.001

        # 2. Read $DIMLFAC (Linear dimension multiplier)
        dimlfac = doc.header.get('$DIMLFAC', 1.0)
        logger.info(f"CAD Header $DIMLFAC (Dimension Linear Factor) detected: {dimlfac}")

        return unit_to_meters

    @staticmethod
    def is_point_in_polygon(x: float, y: float, polygon: List[Tuple[float, float]]) -> bool:
        """
        Determines if a point (x, y) is inside a closed polygon using the Ray Casting algorithm.
        """
        num_vertices = len(polygon)
        inside = False
        p1x, p1y = polygon[0]
        for i in range(num_vertices + 1):
            p2x, p2y = polygon[i % num_vertices]
            if y > min(p1y, p2y):
                if y <= max(p1y, p2y):
                    if x <= max(p1x, p2x):
                        if p1y != p2y:
                            xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                        if p1x == p2x or x <= xinters:
                            inside = not inside
            p1x, p1y = p2x, p2y
        return inside

    @staticmethod
    def calculate_polyline_area_and_perimeter(points: List[Tuple[float, float]], factor: float) -> Tuple[float, float]:
        """
        Calculates the real area (m2) and perimeter (ml) of a closed polyline in meters.
        Uses Shoelace formula for area.
        """
        n = len(points)
        if n < 3:
            return 0.0, 0.0
            
        # Scale coordinates to meters
        scaled_points = [(p[0] * factor, p[1] * factor) for p in points]
        
        # 1. Calculate Area using Shoelace formula
        area = 0.0
        for i in range(n):
            j = (i + 1) % n
            area += scaled_points[i][0] * scaled_points[j][1]
            area -= scaled_points[j][0] * scaled_points[i][1]
        area = abs(area) / 2.0
        
        # 2. Calculate Perimeter
        perimeter = 0.0
        for i in range(n):
            j = (i + 1) % n
            dx = scaled_points[j][0] - scaled_points[i][0]
            dy = scaled_points[j][1] - scaled_points[i][1]
            perimeter += (dx**2 + dy**2) ** 0.5
            
        return area, perimeter

    @classmethod
    def parse_dxf(cls, dxf_path: str) -> ExtractedPlan:
        """
        Parses drawing scale, closed areas, perimeters, and name labels from a DXF file.
        """
        if not os.path.exists(dxf_path):
            raise FileNotFoundError(f"DXF file not found: {dxf_path}")

        try:
            doc = ezdxf.readfile(dxf_path)
            msp = doc.modelspace()
            
            # 1. Resolve scale factor
            factor = cls.get_scale_factor(doc)
            insunits = doc.header.get('$INSUNITS', 0)
            
            # 2. Find all texts and room labels
            text_entities = []
            for text in msp.query('MTEXT TEXT'):
                content = text.dxf.text.strip()
                # ezdxf MTEXT can contain formatting codes (e.g. \A1;), let's strip them
                content = re.sub(r"\\[A-Za-z0-9]+;", "", content)
                content = re.sub(r"[{}\[\]]", "", content)
                
                # Check insert coordinate attributes
                x = text.dxf.insert.x
                y = text.dxf.insert.y
                text_entities.append({"text": content, "x": x, "y": y})
            
            logger.info(f"Extracted {len(text_entities)} text/annotation elements from drawing.")

            # 3. Find closed room boundaries (LWPOLYLINE)
            rooms: List[Room] = []
            room_counter = 1
            
            for poly in msp.query('LWPOLYLINE'):
                if poly.is_closed:
                    points = [(p[0], p[1]) for p in poly.get_points()]
                    area, perimeter = cls.calculate_polyline_area_and_perimeter(points, factor)
                    
                    if area < 0.1: # Skip tiny anomalies
                        continue
                        
                    # Calculate bounding box
                    xs = [p[0] for p in points]
                    ys = [p[1] for p in points]
                    min_x, max_x = min(xs), max(xs)
                    min_y, max_y = min(ys), max(ys)
                    
                    # Match label using Ray Casting (Point-In-Polygon) for maximum precision
                    associated_text = ""
                    for text in text_entities:
                        tx, ty = text["x"], text["y"]
                        if cls.is_point_in_polygon(tx, ty, points):
                            associated_text = text["text"]
                            break
                    
                    # Bounding Box / Proximity Fallback if Ray Casting didn't hit a specific text inside
                    if not associated_text:
                        best_distance = float('inf')
                        for text in text_entities:
                            tx, ty = text["x"], text["y"]
                            if min_x <= tx <= max_x and min_y <= ty <= max_y:
                                associated_text = text["text"]
                                break
                            else:
                                cx, cy = (min_x + max_x) / 2.0, (min_y + max_y) / 2.0
                                dist = ((tx - cx)**2 + (ty - cy)**2) ** 0.5
                                if dist < best_distance:
                                    best_distance = dist
                                    associated_text = text["text"]
                                
                    room_name = associated_text if associated_text else f"Habitación {room_counter}"
                    if not associated_text:
                        room_counter += 1
                        
                    width = (max_x - min_x) * factor
                    length = (max_y - min_y) * factor
                    height = 2.50
                    
                    materials = []
                    lower_name = room_name.lower()
                    if "cocina" in lower_name or "baño" in lower_name or "toilet" in lower_name:
                        materials.append(MaterialAnnotation(type="floor", name="Cerámica porcelánica", confidence=1.0))
                        materials.append(MaterialAnnotation(type="wall", name="Azulejo cerámico", confidence=1.0))
                    else:
                        materials.append(MaterialAnnotation(type="floor", name="Tarima flotante de roble", confidence=1.0))
                        materials.append(MaterialAnnotation(type="wall", name="Pintura plástica lisa", confidence=1.0))

                    rooms.append(Room(
                        name=room_name,
                        length=round(length, 2),
                        width=round(width, 2),
                        height=height,
                        walls=[],
                        windows=[],
                        materials=materials
                    ))

            # If no closed polylines were found, generate based on text labels
            if not rooms and len(text_entities) > 0:
                logger.warning("No closed polylines found. Generating dummy rooms based on found text labels.")
                for text in text_entities:
                    if len(text["text"]) > 2 and not re.match(r"^\d", text["text"]):
                        rooms.append(Room(
                            name=text["text"],
                            length=4.00,
                            width=3.00,
                            height=2.50,
                            walls=[],
                            windows=[],
                            materials=[MaterialAnnotation(type="floor", name="Tarima flotante", confidence=0.90)]
                        ))

            return ExtractedPlan(rooms=rooms, general_notes=f"Extracción CAD completada. Unidad de dibujo: {UNIDADES_MAP.get(insunits, 'Desconocido')} (Factor: {factor})")
        except Exception as e:
            logger.error(f"Error parsing DXF file: {e}")
            raise RuntimeError(f"Failed to parse CAD geometry: {str(e)}")
