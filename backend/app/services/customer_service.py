from sqlalchemy import func
from sqlalchemy.orm import Session

from app.exceptions import ConflictError, NotFoundError
from app.models.customer import Customer
from app.models.order import Order
from app.schemas.customer import CustomerCreate


def list_customers(db: Session) -> list[Customer]:
    return db.query(Customer).order_by(Customer.id).all()


def get_customer(db: Session, customer_id: int) -> Customer:
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise NotFoundError(f"Customer with id {customer_id} not found")
    return customer


def create_customer(db: Session, payload: CustomerCreate) -> Customer:
    existing = (
        db.query(Customer)
        .filter(func.lower(Customer.email) == payload.email.lower())
        .first()
    )
    if existing:
        raise ConflictError(f"Customer with email '{payload.email}' already exists")

    customer = Customer(
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


def delete_customer(db: Session, customer_id: int) -> None:
    customer = get_customer(db, customer_id)
    has_orders = db.query(Order).filter(Order.customer_id == customer_id).first()
    if has_orders:
        raise ConflictError("Cannot delete customer with existing orders")

    db.delete(customer)
    db.commit()
