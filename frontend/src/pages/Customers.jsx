import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import Alert from '../components/Alert';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../utils/format';

const emptyForm = {
  full_name: '',
  email: '',
  phone: '',
};

function validateCustomerForm(form) {
  const errors = {};
  if (!form.full_name.trim()) errors.full_name = 'Full name is required';
  if (!form.email.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Enter a valid email address';
  }
  if (!form.phone.trim()) errors.phone = 'Phone number is required';
  return errors;
}

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const { toast, showToast, clearToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getCustomers();
      setCustomers(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load customers'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setForm(emptyForm);
    setFormErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
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
    const errors = validateCustomerForm(form);
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      await api.createCustomer({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      });
      showToast('Customer created successfully');
      closeModal();
      load();
    } catch (err) {
      setFormErrors({ form: getErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (customer) => {
    if (!window.confirm(`Delete customer "${customer.full_name}"?`)) return;
    try {
      await api.deleteCustomer(customer.id);
      showToast('Customer deleted');
      load();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete customer'));
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Customers</h2>
          <p className="page-subtitle">Manage customer records</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          + Add Customer
        </button>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type={toast?.type || 'success'} message={toast?.message} onClose={clearToast} />

      {loading ? (
        <LoadingSpinner />
      ) : (
        <section className="card">
          {customers.length === 0 ? (
            <p className="empty-state">No customers yet. Add your first customer.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th className="col-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id}>
                      <td>{customer.full_name}</td>
                      <td>{customer.email}</td>
                      <td>{customer.phone}</td>
                      <td className="col-actions">
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(customer)}
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
        <Modal title="Add Customer" onClose={closeModal}>
          <form onSubmit={handleSubmit} className="form">
            {formErrors.form && <Alert type="error" message={formErrors.form} />}
            <div className="form-group">
              <label htmlFor="full_name">Full Name</label>
              <input
                id="full_name"
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                className={formErrors.full_name ? 'input-error' : ''}
              />
              {formErrors.full_name && <span className="field-error">{formErrors.full_name}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className={formErrors.email ? 'input-error' : ''}
              />
              {formErrors.email && <span className="field-error">{formErrors.email}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className={formErrors.phone ? 'input-error' : ''}
              />
              {formErrors.phone && <span className="field-error">{formErrors.phone}</span>}
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
