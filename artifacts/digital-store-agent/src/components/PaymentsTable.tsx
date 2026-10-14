import type { StorePayment } from '@workspace/api-client-react';
import { formatDate, formatMoney } from './Shared';

function paymentStatus(status: string) {
  const normalized = status.toLowerCase();
  if (['paid', 'succeeded', 'complete', 'completed', 'successful'].includes(normalized)) return { label: 'مكتملة', tone: '' };
  if (['pending', 'processing', 'created'].includes(normalized)) return { label: 'قيد المعالجة', tone: 'warning' };
  if (normalized === 'refunded') return { label: 'مستردة', tone: 'error' };
  if (['failed', 'cancelled', 'canceled'].includes(normalized)) return { label: 'فاشلة أو ملغاة', tone: 'error' };
  return { label: 'حالة غير معروفة', tone: 'neutral' };
}

export function PaymentsTable({ payments }: { payments: StorePayment[] }) {
  if (payments.length === 0) {
    return (
      <div className="empty-state">
        <h3>لا توجد مدفوعات لعرضها</h3>
        <p>ستظهر هنا سجلات الدفع التي توفرها خدمة المتجر عند توفرها.</p>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>المشتري</th>
            <th>المنتج</th>
            <th>المبلغ</th>
            <th>الحالة</th>
            <th>التاريخ</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => {
            const status = paymentStatus(payment.status);
            return (
              <tr key={payment.id} data-testid={`row-payment-${payment.id}`}>
                <td>
                  <div className="buyer-cell">
                    <span className="buyer-dot">{payment.buyerName?.slice(0, 1) || '؟'}</span>
                    <span>{payment.buyerName || 'مشتري غير معروف'}</span>
                  </div>
                </td>
                <td>{payment.productTitle || 'منتج غير محدد'}</td>
                <td style={{ fontWeight: 700, color: '#39464d' }}>{formatMoney(payment.amount, payment.currency)}</td>
                <td><span className={`status-pill ${status.tone}`}>{status.label}</span></td>
                <td>{formatDate(payment.createdAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
