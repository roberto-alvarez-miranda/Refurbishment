import pytest
from app.models.budget import (
    Parameter, Resource, MeasurementLine, BudgetItem, Chapter, ProjectBudget, ResourceYield
)
from app.services.calculator import BudgetCalculator

def test_calculate_budget_item_cost():
    # Setup resources
    resources = {
        "res-1": Resource(id="res-1", project_id="p-1", code="MO", name="Labor", resource_type="labor", base_price=20.0),
        "res-2": Resource(id="res-2", project_id="p-1", code="MAT", name="Brick", resource_type="material", base_price=0.5)
    }

    # Setup item with resources and measurements
    item = BudgetItem(
        id="item-1",
        chapter_id="c-1",
        project_id="p-1",
        code="ALB",
        name="Wall",
        unit_type="m2",
        resources=[
            ResourceYield(resource_id="res-1", quantity=1.5), # 1.5 hours/m2 * 20 = 30.0
            ResourceYield(resource_id="res-2", quantity=50.0) # 50 bricks/m2 * 0.5 = 25.0
            # Unit price should be 55.0
        ],
        measurement_lines=[
            MeasurementLine(id="m-1", length=5.0, height=2.0), # 10.0 m2
            MeasurementLine(id="m-2", length=2.0, height=2.0)  # 4.0 m2
            # Total quantity = 14.0 m2
        ]
    )

    calculator = BudgetCalculator(resources=resources)
    calculated_item = calculator.calculate_item(item)

    assert calculated_item.calculated_unit_price == 55.0
    assert calculated_item.calculated_quantity == 14.0
    assert calculated_item.total_cost == 770.0 # 55.0 * 14.0

def test_calculate_project_budget():
    resources = {
        "res-1": Resource(id="res-1", project_id="p-1", code="MO", name="Labor", resource_type="labor", base_price=20.0)
    }
    
    item = BudgetItem(
        id="item-1",
        chapter_id="chap-1",
        project_id="p-1",
        code="ALB",
        name="Wall",
        unit_type="m2",
        resources=[ResourceYield(resource_id="res-1", quantity=1.0)], # 20.0/m2
        measurement_lines=[MeasurementLine(id="m-1", length=10.0)] # 10.0 m2 -> cost = 200.0
    )

    chapter = Chapter(
        id="chap-1",
        project_id="p-1",
        code="C01",
        name="Masonry"
    )

    budget = ProjectBudget(
        id="p-1",
        name="House Renovation"
    )

    calculator = BudgetCalculator(resources=resources)
    # Calculate full tree
    calc_budget, calc_chapters, calc_items = calculator.calculate_project(budget, [chapter], [item])

    assert calc_items[0].total_cost == 200.0
    assert calc_chapters[0].total_cost == 200.0
    assert calc_budget.total_cost == 200.0
