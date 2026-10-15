import { getListStorePaymentsQueryKey, useListStorePayments } from '@workspace/api-client-react';
import { CreditCard, RefreshCw } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { PaymentsTable } from '../components/PaymentsTable';
import { ErrorState, PageHeading, getErrorMessage } from '../components/Shared';

export function SalesPage() {
  const payments = useListStorePayments({ query: { queryKey: getListStorePaymentsQueryKey() } });

  return (
    <AppShell>
      <div className="page-content" dir="rtl">
        <PageHeading
          eyebrow="المعاملات"
          title="المبيعات"
          description="سجل المدفوعات الذي توفره Whop، دون تقديرات أو أرقام بديلة."
          action={<button className="btn-secondary" type="button" onClick={() => payments.refetch()} disabled={payments.isFetching} data-testid="button-refresh-sales"><RefreshCw size={14} /> تحديث السجل</button>}
        />
        <div className="banner" style={{ marginBottom: 17 }}>
          <span>i</span>
          <div><strong>سجل مباشر من Whop</strong>تظهر هنا المدفوعات التي أعادتها الخدمة فقط. لا نضيف معاملات تجريبية إلى السجل.</div>
        </div>
        {payments.isLoading && (
          <div className="panel" style={{ padding: 23, display: 'grid', gap: 18 }}>
            {[0, 1, 2, 3].map((item) => <div className="skeleton" key={item} style={{ width: `${95 - item * 8}%` }} />)}
          </div>
        )}
        {payments.isError && <ErrorState message={`تعذر تحميل سجل المدفوعات. ${getErrorMessage(payments.error)}`} onRetry={() => payments.refetch()} />}
        {payments.data && (
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2 className="panel-title">سجل المدفوعات</h2>
                <div className="panel-subtitle">{payments.data.length.toLocaleString('ar')} سجل ضمن الاستجابة الحالية</div>
              </div>
              <CreditCard size={18} color="#397db7" />
            </div>
            <PaymentsTable payments={payments.data} />
          </section>
        )}
      </div>
    </AppShell>
  );
}
