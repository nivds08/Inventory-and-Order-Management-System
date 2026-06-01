import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import Alert from '../components/Alert';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { useToast } from '../hooks/useToast';
import { formatCurrency, getErrorMessage } from '../utils/format';

const emptyForm = {
  name: '',
  sku: '',
  price: '',
  quantity_in_stock: '',
};

function validateProductForm(form, isEdit = false) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Name is required';
  if (!isEdit && !form.sku.trim()) errors.sku = 'SKU is required';
  if (isEdit && form.sku !== undefined && !String(form.sku).trim()) errors.sku = 'SKU is required';
  const price = Number(form.price);
  if (form.price === '' || Number.isNaN(price) || price < 0) errors.price = 'Valid price is required';
  const qty = Number(form.quantity_in_stock);
  if (form.quantity_in_stock === '' || Number.isNaN(qty) || qty < 0 || !Number.isInteger(qty)) {
    errors.quantity_in_stock = 'Valid whole number stock quantity is required';
  }
  return errors;
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const { toast, showToast, clearToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load products'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (product) => {
    setEditing(product);
    setForm({
      name: product.name,
      sku: product.sku,
      price: String(product.price),
      quantity_in_stock: String(product.quantity_in_stock),
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setFormErrors({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateProductForm(form, Boolean(editing));
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      price: Number(form.price),
      quantity_in_stock: Number(form.quantity_in_stock),
    };

    setSubmitting(true);
    try {
      if (editing) {
        await api.updateProduct(editing.id, payload);
        showToast('Product updated successfully');
      } else {
        await api.createProduct(payload);
        showToast('Product created successfully');
      }
      closeModal();
      load();
    } catch (err) {
      setFormErrors({ form: getErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete product "${product.name}"?`)) return;
    try {
      await api.deleteProduct(product.id);
      showToast('Product deleted', 'success');
      load();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete product'));
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Products</h2>
          <p className="page-subtitle">Manage catalog and inventory levels</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          + Add Product
        </button>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type={toast?.type} message={toast?.message} onClose={clearToast} />

      {loading ? (
        <LoadingSpinner />
      ) : (
        <section className="card">
          {products.length === 0 ? (
            <p className="empty-state">No products yet. Add your first product.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>SKU</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th className="col-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>{product.name}</td>
                      <td>
                        <code>{product.sku}</code>
                      </td>
                      <td>{formatCurrency(product.price)}</td>
                      <td>
                        <span
                          className={
                            product.quantity_in_stock <= 10 ? 'badge badge-warning' : 'badge'
                          }
                        >
                          {product.quantity_in_stock}
                        </span>
                      </td>
                      <td className="col-actions">
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => openEdit(product)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(product)}
                        >
                          Delete
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

      {modalOpen && (
        <Modal title={editing ? 'Edit Product' : 'Add Product'} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="form">
            {formErrors.form && <Alert type="error" message={formErrors.form} />}
            <div className="form-group">
              <label htmlFor="name">Product Name</label>
              <input
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                className={formErrors.name ? 'input-error' : ''}
              />
              {formErrors.name && <span className="field-error">{formErrors.name}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="sku">SKU / Code</label>
              <input
                id="sku"
                name="sku"
                value={form.sku}
                onChange={handleChange}
                className={formErrors.sku ? 'input-error' : ''}
              />
              {formErrors.sku && <span className="field-error">{formErrors.sku}</span>}
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="price">Price ($)</label>
                <input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={handleChange}
                  className={formErrors.price ? 'input-error' : ''}
                />
                {formErrors.price && <span className="field-error">{formErrors.price}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="quantity_in_stock">Stock Quantity</label>
                <input
                  id="quantity_in_stock"
                  name="quantity_in_stock"
                  type="number"
                  min="0"
                  step="1"
                  value={form.quantity_in_stock}
                  onChange={handleChange}
                  className={formErrors.quantity_in_stock ? 'input-error' : ''}
                />
                {formErrors.quantity_in_stock && (
                  <span className="field-error">{formErrors.quantity_in_stock}</span>
                )}
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
