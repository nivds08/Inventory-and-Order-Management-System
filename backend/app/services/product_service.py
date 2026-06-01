from sqlalchemy import func
from sqlalchemy.orm import Session

from app.exceptions import ConflictError, NotFoundError
from app.models.order_item import OrderItem
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate


def list_products(db: Session) -> list[Product]:
    return db.query(Product).order_by(Product.id).all()


def get_product(db: Session, product_id: int) -> Product:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise NotFoundError(f"Product with id {product_id} not found")
    return product


def create_product(db: Session, payload: ProductCreate) -> Product:
    existing = db.query(Product).filter(func.lower(Product.sku) == payload.sku.lower()).first()
    if existing:
        raise ConflictError(f"Product with SKU '{payload.sku}' already exists")

    product = Product(
        name=payload.name,
        sku=payload.sku,
        price=payload.price,
        quantity_in_stock=payload.quantity_in_stock,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def update_product(db: Session, product_id: int, payload: ProductUpdate) -> Product:
    product = get_product(db, product_id)
    data = payload.model_dump(exclude_unset=True)

    if "sku" in data and data["sku"].lower() != product.sku.lower():
        existing = (
            db.query(Product)
            .filter(func.lower(Product.sku) == data["sku"].lower(), Product.id != product_id)
            .first()
        )
        if existing:
            raise ConflictError(f"Product with SKU '{data['sku']}' already exists")

    for field, value in data.items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    return product


def delete_product(db: Session, product_id: int) -> None:
    product = get_product(db, product_id)
    in_orders = db.query(OrderItem).filter(OrderItem.product_id == product_id).first()
    if in_orders:
        raise ConflictError("Cannot delete product that is referenced by existing orders")

    db.delete(product)
    db.commit()
