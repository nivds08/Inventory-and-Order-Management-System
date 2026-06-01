from decimal import Decimal

from sqlalchemy.orm import Session, joinedload

from app.exceptions import BadRequestError, NotFoundError
from app.models.customer import Customer
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.product import Product
from app.schemas.order import OrderCreate, OrderItemResponse, OrderListResponse, OrderResponse


def _build_order_response(order: Order) -> OrderResponse:
    items = [
        OrderItemResponse(
            id=item.id,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
            line_total=item.line_total,
            product_name=item.product.name if item.product else None,
            product_sku=item.product.sku if item.product else None,
        )
        for item in order.items
    ]
    return OrderResponse(
        id=order.id,
        customer_id=order.customer_id,
        total_amount=order.total_amount,
        created_at=order.created_at,
        items=items,
        customer_name=order.customer.full_name if order.customer else None,
        customer_email=order.customer.email if order.customer else None,
    )


def list_orders(db: Session) -> list[OrderListResponse]:
    orders = (
        db.query(Order)
        .options(joinedload(Order.customer), joinedload(Order.items))
        .order_by(Order.created_at.desc())
        .all()
    )
    return [
        OrderListResponse(
            id=order.id,
            customer_id=order.customer_id,
            total_amount=order.total_amount,
            created_at=order.created_at,
            customer_name=order.customer.full_name if order.customer else None,
            item_count=len(order.items),
        )
        for order in orders
    ]


def get_order(db: Session, order_id: int) -> OrderResponse:
    order = (
        db.query(Order)
        .options(
            joinedload(Order.customer),
            joinedload(Order.items).joinedload(OrderItem.product),
        )
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise NotFoundError(f"Order with id {order_id} not found")
    return _build_order_response(order)


def create_order(db: Session, payload: OrderCreate) -> OrderResponse:
    customer = db.query(Customer).filter(Customer.id == payload.customer_id).first()
    if not customer:
        raise NotFoundError(f"Customer with id {payload.customer_id} not found")

    product_ids = [item.product_id for item in payload.items]
    products = db.query(Product).filter(Product.id.in_(product_ids)).all()
    products_by_id = {product.id: product for product in products}

    if len(products_by_id) != len(product_ids):
        missing = set(product_ids) - set(products_by_id.keys())
        raise NotFoundError(f"Product(s) not found: {sorted(missing)}")

    order_items_data: list[tuple[Product, int, Decimal, Decimal]] = []
    total_amount = Decimal("0.00")

    for line in payload.items:
        product = products_by_id[line.product_id]
        if product.quantity_in_stock < line.quantity:
            raise BadRequestError(
                f"Insufficient stock for product '{product.name}' (SKU: {product.sku}). "
                f"Requested: {line.quantity}, available: {product.quantity_in_stock}"
            )
        line_total = (product.price * line.quantity).quantize(Decimal("0.01"))
        order_items_data.append((product, line.quantity, product.price, line_total))
        total_amount += line_total

    try:
        order = Order(customer_id=customer.id, total_amount=total_amount)
        db.add(order)
        db.flush()

        for product, quantity, unit_price, line_total in order_items_data:
            db.add(
                OrderItem(
                    order_id=order.id,
                    product_id=product.id,
                    quantity=quantity,
                    unit_price=unit_price,
                    line_total=line_total,
                )
            )
            product.quantity_in_stock -= quantity

        db.commit()
    except Exception:
        db.rollback()
        raise

    order = (
        db.query(Order)
        .options(
            joinedload(Order.customer),
            joinedload(Order.items).joinedload(OrderItem.product),
        )
        .filter(Order.id == order.id)
        .first()
    )
    return _build_order_response(order)


def delete_order(db: Session, order_id: int) -> None:
    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise NotFoundError(f"Order with id {order_id} not found")

    try:
        for item in order.items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if product:
                product.quantity_in_stock += item.quantity

        db.delete(order)
        db.commit()
    except Exception:
        db.rollback()
        raise
