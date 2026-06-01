export default function LoadingSpinner({ label = 'Loading...' }) {
  return (
    <div className="loading" aria-live="polite">
      <div className="spinner" />
      <span>{label}</span>
    </div>
  );
}
