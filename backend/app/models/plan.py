from typing import List, Optional
from pydantic import BaseModel

class MaterialAnnotation(BaseModel):
    type: str  # e.g., "floor", "wall", "ceiling", "window"
    name: str  # e.g., "Oak Wood", "Brick", "Double Glazing"
    confidence: float # AI confidence score (0.0 to 1.0)

class Wall(BaseModel):
    length: float
    height: float
    materials: List[MaterialAnnotation] = []

class Window(BaseModel):
    width: float
    height: float
    materials: List[MaterialAnnotation] = []

class Room(BaseModel):
    name: str
    length: float
    width: float
    height: float
    walls: List[Wall] = []
    windows: List[Window] = []
    materials: List[MaterialAnnotation] = []

class ExtractedPlan(BaseModel):
    rooms: List[Room] = []
    general_notes: Optional[str] = None
