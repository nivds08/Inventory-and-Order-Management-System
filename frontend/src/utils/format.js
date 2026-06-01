export function formatCurrency(value) {
  const amount = Number(value);
  if (Number.isNaN(amount)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function getErrorMessage(error, fallback = 'Something went wrong') {
  if (!error) return fallback;
  if (error.errors?.length) {
    return error.errors.map((e) => `${e.field}: ${e.message}`).join(', ');
  }
  return error.message || fallback;
}
