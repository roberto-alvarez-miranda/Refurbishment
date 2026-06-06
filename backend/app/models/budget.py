from typing import List, Dict, Optional, Literal
from pydantic import BaseModel, Field

# Represents a variable or parameter used in parametric measurements
class Parameter(BaseModel):
    name: str
    value: float # In a fully advanced version, this could also be a formula/string, but we start with evaluated floats

# Resource (Básico): Labor, Material, or Machinery
class Resource(BaseModel):
    id: str
    project_id: str
    code: str
    name: str
    resource_type: Literal["material", "labor", "machinery"]
    base_price: float = Field(ge=0.0)

# Links a resource to a BudgetItem, with a specific yield (Rendimiento)
class ResourceYield(BaseModel):
    resource_id: str
    quantity: float = Field(gt=0.0) # E.g., 1.5 hours of labor, or 10.5 bricks per m2
    
# Detailed Measurement Line (Línea de medición)
class MeasurementLine(BaseModel):
    id: str
    description: Optional[str] = None
    units: float = 1.0
    length: float = 1.0
    width: float = 1.0
    height: float = 1.0
    
    @property
    def subtotal(self) -> float:
        return self.units * self.length * self.width * self.height

# BudgetItem (Partida)
class BudgetItem(BaseModel):
    id: str
    chapter_id: str
    project_id: str
    code: str
    name: str
    unit_type: str # e.g., "m2", "ml", "ud"
    resources: List[ResourceYield] = Field(default_factory=list)
    measurement_lines: List[MeasurementLine] = Field(default_factory=list)
    
    # These would normally be calculated dynamically or synced from the calc engine
    calculated_unit_price: float = 0.0
    calculated_quantity: float = 0.0
    
    @property
    def total_cost(self) -> float:
        return self.calculated_unit_price * self.calculated_quantity

# Chapter (Capítulo)
class Chapter(BaseModel):
    id: str
    project_id: str
    parent_chapter_id: Optional[str] = None # For nested chapters
    code: str
    name: str
    # In BQ/Firestore we query items by chapter_id, so we don't necessarily nest them here, 
    # but we can store aggregated costs for quick UI reads.
    total_cost: float = 0.0

# Project Budget Root
class ProjectBudget(BaseModel):
    id: str
    name: str
    parameters: Dict[str, Parameter] = Field(default_factory=dict)
    total_cost: float = 0.0
