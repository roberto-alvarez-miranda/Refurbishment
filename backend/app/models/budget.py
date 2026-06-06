from typing import List
from pydantic import BaseModel, Field

class ConstructionUnit(BaseModel):
    id: str
    code: str
    name: str
    description: str | None = None
    unit_type: str
    base_price: float = Field(ge=0.0)

class ExecutionUnit(BaseModel):
    id: str
    construction_unit_id: str
    quantity: float = Field(gt=0.0)
    quality_multiplier: float = Field(default=1.0, gt=0.0)

    @property
    def calculated_price(self) -> float:
        # We'll need the base_price to actually calculate this later, 
        # but for now we fulfill the interface expected by the tests.
        return 0.0

class BudgetItem(BaseModel):
    id: str
    name: str
    execution_units: List[ExecutionUnit] = []

    @property
    def total_cost(self) -> float:
        return 0.0
