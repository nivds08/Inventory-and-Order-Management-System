from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    sku: str = Field(..., min_length=1, max_length=100)
    price: Decimal = Field(..., ge=0)
    quantity_in_stock: int = Field(..., ge=0)

    @field_validator("price")
    @classmethod
    def price_must_have_at_most_two_decimal_places(cls, value: Decimal) -> Decimal:
        if value.as_tuple().exponent < -2:
            raise ValueError("Price must have at most 2 decimal places")
        return value


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    sku: str | None = Field(None, min_length=1, max_length=100)
    price: Decimal | None = Field(None, ge=0)
    quantity_in_stock: int | None = Field(None, ge=0)

    @field_validator("price")
    @classmethod
    def price_must_have_at_most_two_decimal_places(cls, value: Decimal | None) -> Decimal | None:
        if value is not None and value.as_tuple().exponent < -2:
            raise ValueError("Price must have at most 2 decimal places")
        return value


class ProductResponse(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
