import type { ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

export function LoadingCards({ count = 4 }: { count?: number }) {
  return (
    <div className="metric-grid" aria-label="جارٍ تحميل البيانات">
      {Array.from({ length: count }, (_, index) => (
        <div className="panel skeleton-card" key={index}>
          <div className="skeleton" style={{ width: '55%' }} />
          <div className="skeleton" style={{ width: '70%', height: 26, marginTop: 23 }} />
          <div className="skeleton" style={{ width: '42%', marginTop: 12 }} />
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="panel error-card" role="alert">
      <AlertCircle size={24} />
      <p>{message}</p>
      {onRetry && (
        <button className="btn-secondary" type="button" onClick={onRetry} data-testid="button-retry">
          <RefreshCw size={14} />
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, description, icon }: { title: string; description: string; icon: ReactNode }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

export function formatMoney(amount: number | null | undefined, currency = 'usd') {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return '—';
  try {
    return new Intl.NumberFormat('ar', { style: 'currency', currency: currency.toUpperCase(), maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount.toLocaleString('ar')} ${currency.toUpperCase()}`;
  }
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ar', { dateStyle: 'medium' }).format(date);
}

export function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  return 'تعذر إكمال الطلب. يرجى المحاولة مرة أخرى.';
}
