import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import Alert from '../components/Alert';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { useToast } from '../hooks/useToast';
import { formatCurrency, formatDate, getErrorMessage } from '../utils/format';

const emptyLine = { product_id: '', quantity: '1' };

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [lines, setLines] = useState([{ ...emptyLine }]);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const { toast, showToast, clearToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ordersData, customersData, productsData] = await Promise.all([
        api.getOrders(),
        api.getCustomers(),
        api.getProducts(),
      ]);
      setOrders(ordersData);
      setCustomers(customersData);
      setProducts(productsData);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load orders'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const productsById = useMemo(
    () => Object.fromEntries(products.map((p) => [p.id, p])),
    [products],
  );

  const estimatedTotal = useMemo(() => {
    return lines.reduce((sum, line) => {
      const product = productsById[Number(line.product_id)];
      const qty = Number(line.quantity);
      if (!product || !qty || qty < 1) return sum;
      return sum + Number(product.price) * qty;
    }, 0);
  }, [lines, productsById]);

  const openCreate = () => {
    setCustomerId(customers[0]?.id ? String(customers[0].id) : '');
    setLines([{ ...emptyLine }]);
    setFormErrors({});
    setCreateOpen(true);
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setFormErrors({});
  };

  const updateLine = (index, field, value) => {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)),
    );
    setFormErrors((prev) => ({ ...prev, lines: undefined, form: undefined }));
  };

  const addLine = () => {
    setLines((prev) => [...prev, { ...emptyLine }]);
  };

  const removeLine = (index) => {
    if (lines.length === 1) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const validateOrderForm = () => {
    const errors = {};
    if (!customerId) errors.customer = 'Select a customer';
    const parsedLines = [];
    const seenProducts = new Set();

    lines.forEach((line, index) => {
      const productId = Number(line.product_id);
      const quantity = Number(line.quantity);
      if (!line.product_id) {
        errors[`line_${index}`] = 'Select a product';
        return;
      }
      if (!quantity || quantity < 1 || !Number.isInteger(quantity)) {
        errors[`line_${index}`] = 'Quantity must be a positive whole number';
        return;
      }
      if (seenProducts.has(productId)) {
        errors.lines = 'Each product can only appear once per order';
        return;
      }
      seenProducts.add(productId);
      const product = productsById[productId];
      if (product && product.quantity_in_stock < quantity) {
        errors[`line_${index}`] = `Only ${product.quantity_in_stock} in stock`;
      }
      parsedLines.push({ product_id: productId, quantity });
    });

    if (!errors.lines && parsedLines.length === 0) {
      errors.lines = 'Add at least one order line';
    }

    return { errors, parsedLines };
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const { errors, parsedLines } = validateOrderForm();
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      await api.createOrder({
        customer_id: Number(customerId),
        items: parsedLines,
      });
      showToast('Order created successfully');
      closeCreate();
      load();
    } catch (err) {
      setFormErrors({ form: getErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const viewOrder = async (orderId) => {
    setDetailLoading(true);
    setDetailOrder(null);
    try {
      const data = await api.getOrder(orderId);
      setDetailOrder(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load order details'));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (order) => {
    const label = order.customer_name || `Order #${order.id}`;
    if (
      !window.confirm(
        `Cancel/delete order for ${label}? Stock will be restored to inventory.`,
      )
    ) {
      return;
    }
    try {
      await api.deleteOrder(order.id);
      showToast('Order cancelled — stock restored');
      load();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete order'));
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Orders</h2>
          <p className="page-subtitle">Create and track customer orders</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={openCreate}
          disabled={customers.length === 0 || products.length === 0}
          title={
            customers.length === 0 || products.length === 0
              ? 'Add customers and products first'
              : ''
          }
        >
          + Create Order
        </button>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type={toast?.type || 'success'} message={toast?.message} onClose={clearToast} />

      {(customers.length === 0 || products.length === 0) && !loading && (
        <Alert
          type="info"
          message="Add at least one customer and one product before creating orders."
        />
      )}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <section className="card">
          {orders.length === 0 ? (
            <p className="empty-state">No orders yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Date</th>
                    <th className="col-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>#{order.id}</td>
                      <td>{order.customer_name || `Customer #${order.customer_id}`}</td>
                      <td>{order.item_count}</td>
                      <td>{formatCurrency(order.total_amount)}</td>
                      <td>{formatDate(order.created_at)}</td>
                      <td className="col-actions">
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => viewOrder(order.id)}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(order)}
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {createOpen && (
        <Modal title="Create Order" onClose={closeCreate} wide>
          <form onSubmit={handleCreate} className="form">
            {formErrors.form && <Alert type="error" message={formErrors.form} />}
            {formErrors.lines && <Alert type="error" message={formErrors.lines} />}

            <div className="form-group">
              <label htmlFor="customer_id">Customer</label>
              <select
                id="customer_id"
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value);
                  setFormErrors((prev) => ({ ...prev, customer: undefined }));
                }}
                className={formErrors.customer ? 'input-error' : ''}
              >
                <option value="">Select customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.email})
                  </option>
                ))}
              </select>
              {formErrors.customer && <span className="field-error">{formErrors.customer}</span>}
            </div>

            <div className="order-lines">
              <div className="order-lines-header">
                <h4>Order Items</h4>
                <button type="button" className="btn btn-sm btn-secondary" onClick={addLine}>
                  + Add line
                </button>
              </div>
              {lines.map((line, index) => (
                <div key={index} className="order-line">
                  <div className="form-group flex-grow">
                    <label>Product</label>
                    <select
                      value={line.product_id}
                      onChange={(e) => updateLine(index, 'product_id', e.target.value)}
                      className={formErrors[`line_${index}`] ? 'input-error' : ''}
                    >
                      <option value="">Select product</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku}) — {p.quantity_in_stock} in stock —{' '}
                          {formatCurrency(p.price)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group line-qty">
                    <label>Qty</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={line.quantity}
                      onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                      className={formErrors[`line_${index}`] ? 'input-error' : ''}
                    />
                  </div>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-sm btn-danger line-remove"
                      onClick={() => removeLine(index)}
                      aria-label="Remove line"
                    >
                      ×
                    </button>
                  )}
                  {formErrors[`line_${index}`] && (
                    <span className="field-error line-error">{formErrors[`line_${index}`]}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="order-estimate">
              <span>Estimated total (calculated by server on submit):</span>
              <strong>{formatCurrency(estimatedTotal)}</strong>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={closeCreate}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Order'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {(detailOrder || detailLoading) && (
        <Modal
          title={detailOrder ? `Order #${detailOrder.id}` : 'Order Details'}
          onClose={() => setDetailOrder(null)}
          wide
        >
          {detailLoading ? (
            <LoadingSpinner label="Loading order..." />
          ) : (
            detailOrder && (
              <div className="order-detail">
                <dl className="detail-grid">
                  <div>
                    <dt>Customer</dt>
                    <dd>
                      {detailOrder.customer_name}
                      <br />
                      <small>{detailOrder.customer_email}</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Date</dt>
                    <dd>{formatDate(detailOrder.created_at)}</dd>
                  </div>
                  <div>
                    <dt>Total</dt>
                    <dd className="detail-total">{formatCurrency(detailOrder.total_amount)}</dd>
                  </div>
                </dl>
                <h4>Line Items</h4>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailOrder.items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.product_name}</td>
                          <td>
                            <code>{item.product_sku}</code>
                          </td>
                          <td>{item.quantity}</td>
                          <td>{formatCurrency(item.unit_price)}</td>
                          <td>{formatCurrency(item.line_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </Modal>
      )}
    </div>
  );
}
