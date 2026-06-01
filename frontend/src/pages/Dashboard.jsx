import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import Alert from '../components/Alert';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCurrency, getErrorMessage } from '../utils/format';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getDashboard();
      setStats(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load dashboard'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingSpinner label="Loading dashboard..." />;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p className="page-subtitle">Overview of your inventory and orders</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={load}>
          Refresh
        </button>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      {stats && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">Total Products</span>
              <span className="stat-value">{stats.total_products}</span>
              <Link to="/products" className="stat-link">
                Manage products →
              </Link>
            </div>
            <div className="stat-card">
              <span className="stat-label">Total Customers</span>
              <span className="stat-value">{stats.total_customers}</span>
              <Link to="/customers" className="stat-link">
                Manage customers →
              </Link>
            </div>
            <div className="stat-card">
              <span className="stat-label">Total Orders</span>
              <span className="stat-value">{stats.total_orders}</span>
              <Link to="/orders" className="stat-link">
                View orders →
              </Link>
            </div>
            <div className="stat-card stat-card-warning">
              <span className="stat-label">Low Stock Items</span>
              <span className="stat-value">{stats.low_stock_products.length}</span>
              <span className="stat-hint">Quantity ≤ 10</span>
            </div>
          </div>

          <section className="card">
            <div className="card-header">
              <h3>Low Stock Products</h3>
            </div>
            {stats.low_stock_products.length === 0 ? (
              <p className="empty-state">All products are adequately stocked.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>SKU</th>
                      <th>Stock</th>
                      <th>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.low_stock_products.map((product) => (
                      <tr key={product.id}>
                        <td>{product.name}</td>
                        <td>
                          <code>{product.sku}</code>
                        </td>
                        <td>
                          <span className="badge badge-warning">{product.quantity_in_stock}</span>
                        </td>
                        <td>{formatCurrency(product.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
