"""
ApexEval HIDDEN test file for the Python Calculator assignment.
This file is injected by the PythonRunner at grading time - it is NOT
visible to the student in their workspace.
"""
import pytest
from calculator import add, subtract, multiply, divide, power


class TestCalculator:
    def test_add_integers(self):
        assert add(2, 3) == 5

    def test_add_floats(self):
        assert add(2.5, 3.1) == 5.6

    def test_add_negative(self):
        assert add(-1, 1) == 0

    def test_subtract_integers(self):
        assert subtract(5, 3) == 2

    def test_subtract_floats(self):
        assert subtract(5.5, 2.2) == 3.3

    def test_multiply_integers(self):
        assert multiply(4, 5) == 20

    def test_multiply_floats(self):
        assert multiply(2.5, 4.0) == 10.0

    def test_multiply_by_zero(self):
        assert multiply(100, 0) == 0

    def test_divide_integers(self):
        assert divide(10, 2) == 5

    def test_divide_floats(self):
        assert divide(7.5, 2.5) == 3.0

    def test_divide_by_zero_raises(self):
        with pytest.raises(ValueError, match="Cannot divide by zero"):
            divide(5, 0)

    def test_power_integers(self):
        assert power(2, 3) == 8

    def test_power_floats(self):
        assert power(2.0, 3.0) == 8.0

    def test_power_zero_exponent(self):
        assert power(5, 0) == 1

    def test_power_negative_exponent(self):
        assert power(2, -1) == 0.5