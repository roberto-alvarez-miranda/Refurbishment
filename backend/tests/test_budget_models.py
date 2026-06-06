import pytest
from pydantic import ValidationError
from app.models.budget import (
    Resource, MeasurementLine, BudgetItem, Chapter, ProjectBudget, ResourceYield
)

def test_resource_creation():
    r = Resource(
        id="res-001",
        project_id="proj-001",
        code="MO-01",
        name="Peón",
        resource_type="labor",
        base_price=18.5
    )
    assert r.code == "MO-01"
    assert r.resource_type == "labor"

def test_measurement_line_calculation():
    ml = MeasurementLine(
        id="ml-001",
        units=2.0,
        length=3.0,
        width=1.5,
        height=1.0
    )
    # 2 * 3 * 1.5 * 1 = 9.0
    assert ml.subtotal == 9.0

def test_budget_item_total():
    item = BudgetItem(
        id="item-001",
        chapter_id="chap-001",
        project_id="proj-001",
        code="ALB-01",
        name="Tabique",
        unit_type="m2",
        calculated_unit_price=15.0,
        calculated_quantity=9.0
    )
    # 15.0 * 9.0 = 135.0
    assert item.total_cost == 135.0

def test_invalid_resource_price():
    with pytest.raises(ValidationError):
        Resource(
            id="res-002",
            project_id="proj-001",
            code="MAT-01",
            name="Ladrillo",
            resource_type="material",
            base_price=-5.0 # Must be >= 0
        )
