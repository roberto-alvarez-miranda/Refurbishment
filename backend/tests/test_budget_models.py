import pytest
from pydantic import ValidationError
from app.models.budget import ConstructionUnit, ExecutionUnit, BudgetItem

def test_construction_unit_creation():
    unit = ConstructionUnit(
        id="cu-001",
        code="ALB-01",
        name="Tabique de ladrillo",
        description="Muro de ladrillo hueco doble",
        unit_type="m2",
        base_price=15.50
    )
    assert unit.code == "ALB-01"
    assert unit.unit_type == "m2"
    assert unit.base_price == 15.50

def test_construction_unit_invalid_price():
    with pytest.raises(ValidationError):
        ConstructionUnit(
            id="cu-002",
            code="ALB-02",
            name="Tabique",
            unit_type="m2",
            base_price=-5.0 # Invalid negative price
        )

def test_execution_unit_creation():
    unit = ExecutionUnit(
        id="eu-001",
        construction_unit_id="cu-001",
        quantity=12.5,
        quality_multiplier=1.2
    )
    assert unit.quantity == 12.5
    assert unit.quality_multiplier == 1.2
    assert unit.calculated_price == 0.0 # Should be 0 until calculated or explicitly set if it's a property

def test_budget_item_creation():
    item = BudgetItem(
        id="bi-001",
        name="Baño Principal",
        execution_units=[
            ExecutionUnit(
                id="eu-001",
                construction_unit_id="cu-001",
                quantity=10.0,
                quality_multiplier=1.0
            )
        ]
    )
    assert item.name == "Baño Principal"
    assert len(item.execution_units) == 1
    assert item.total_cost == 0.0 # Should be 0 until calculated
