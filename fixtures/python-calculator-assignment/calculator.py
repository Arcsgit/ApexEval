"""
ApexEval sample fixture assignment: Python Calculator.

TODO (student): implement a simple calculator module.

Required behavior:
  - add(a, b): returns sum of two numbers
  - subtract(a, b): returns difference of two numbers
  - multiply(a, b): returns product of two numbers
  - divide(a, b): returns quotient; raises ValueError if b is zero
  - power(a, b): returns a raised to the power of b

Static-check note (Track A staticcheck module will verify this):
  - Must use type hints for all functions
  - Must NOT hardcode return values or fake behavior with print-only stubs
"""

from typing import Union

Number = Union[int, float]


def add(a: Number, b: Number) -> Number:
    """Return the sum of a and b."""
    return a + b


def subtract(a: Number, b: Number) -> Number:
    """Return the difference of a and b."""
    return a - b


def multiply(a: Number, b: Number) -> Number:
    """Return the product of a and b."""
    return a * b


def divide(a: Number, b: Number) -> Number:
    """Return the quotient of a and b. Raises ValueError if b is zero."""
    if b == 0:
        raise ValueError("Cannot divide by zero")
    return a / b


def power(a: Number, b: Number) -> Number:
    """Return a raised to the power of b."""
    return a ** b