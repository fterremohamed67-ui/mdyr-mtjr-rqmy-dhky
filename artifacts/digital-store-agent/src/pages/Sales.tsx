import { useEffect, useMemo, useState } from 'react';
import { getGetWhopStatusQueryKey, getListStorePaymentsQueryKey, useGetWhopStatus, useListStorePayments, type StorePayment } from '@workspace/api-client-react';
import { CreditCard, RefreshCw } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { PaymentsTable } from '../components/PaymentsTable';
import { ErrorState, PageHeading, getErrorMessage } from '../components/Shared';

const localTransactionsStorageKey = 'local_finance_transactions';

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('status' in error)) return undefined;
  return typeof error.status === 'number' ? error.status : undefined;
}

function readLocalTransactions(): StorePayment[] {
  const stored = window.localStorage.getItem(localTransactionsStorageKey);
  if (!stored) return [];

  const parsed: unknown = JSON.parse(stored);
  if (!Array.isArray(parsed)) throw new Error('قائمة المبيعات المحلية غير صالحة.');

  return parsed.filter((transaction): transaction is StorePayment =>
    Boolean(transaction) &&
    typeof transaction === 'object' &&
    typeof transaction.id === 'string' &&
    typeof transaction.amount === 'number' &&
    Number.isFinite(transaction.amount) &&
    typeof transaction.currency === 'string' &&
    typeof transaction.status === 'string' &&
    (transaction.buyerName === null || typeof transaction.buyerName === 'string') &&
    (transaction.productTitle === null || typeof transaction.productTitle === 'string') &&
    (transaction.createdAt === null || typeof transaction.createdAt === 'string'),
  );
}

export function SalesPage() {
  const payments = useListStorePayments({ query: { queryKey: getListStorePaymentsQueryKey() } });
  const services = useGetWhopStatus({ query: { queryKey: getGetWhopStatusQueryKey() } });
  const [localTransactions, setLocalTransactions] = useState<StorePayment[]>([]);
  const [localLoadError, setLocalLoadError] = useState('');

  useEffect(() => {
    try {
      setLocalTransactions(readLocalTransactions());
      setLocalLoadError('');
    } catch (error) {
      setLocalLoadError(error instanceof Error ? error.message : 'تعذر قراءة المبيعات المحلية.');
    }
  }, []);

  const whopUnavailable = getErrorStatus(payments.error) === 503 ||
    getErrorStatus(services.error) === 503 ||
    services.data?.whop === 'configuration_required' ||
    services.data?.whop === 'permissions_required' ||
    services.data?.whop === 'not_connected';
  const otherPaymentError = payments.isError && getErrorStatus(payments.error) !== 503;
  const allPayments = useMemo(() => {
    const combined = [...localTransactions, ...(payments.data ?? [])];
    return combined.sort((first, second) =>
      new Date(second.createdAt ?? 0).getTime() - new Date(first.createdAt ?? 0).getTime(),
    );
  }, [localTransactions, payments.data]);

  return (
    <AppShell>
      <div className="page-content" dir="rtl">
        <PageHeading
          eyebrow="المعاملات"
          title="المبيعات"
          description="سجل مبيعات Whop والمعاملات المحلية المسجلة."
          action={<button className="btn-secondary" type="button" onClick={() => { void payments.refetch(); void services.refetch(); }} disabled={payments.isFetching || services.isFetching} data-testid="button-refresh-sales"><RefreshCw size={14} /> تحديث السجل</button>}
        />
        {whopUnavailable ? (
          <div className="banner info" style={{ marginBottom: 17 }} role="status">
            <CreditCard size={17} />
            <div>
              <strong>مزامنة Whop غير نشطة حالياً</strong>
              لا تتوفر بيانات Whop بسبب إعداد الشركة أو صلاحية company:basic:read. ستظل المعاملات المحلية المسجلة ظاهرة هنا.
            </div>
          </div>
        ) : (
          <div className="banner" style={{ marginBottom: 17 }}>
            <CreditCard size={17} />
            <div><strong>سجل مباشر من Whop</strong>تظهر هنا المدفوعات التي أعادتها الخدمة والمعاملات المحلية المسجلة.</div>
          </div>
        )}
        {payments.isLoading && localTransactions.length === 0 && (
          <div className="panel" style={{ padding: 23, display: 'grid', gap: 18 }}>
            {[0, 1, 2, 3].map((item) => <div className="skeleton" key={item} style={{ width: `${95 - item * 8}%` }} />)}
          </div>
        )}
        {otherPaymentError && <ErrorState message={`تعذر تحميل سجل المدفوعات. ${getErrorMessage(payments.error)}`} onRetry={() => payments.refetch()} />}
        {localLoadError && <div className="banner danger" role="alert" style={{ marginBottom: 16 }}>{localLoadError}</div>}
        {allPayments.length > 0 ? (
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2 className="panel-title">سجل المدفوعات</h2>
                <div className="panel-subtitle">{allPayments.length.toLocaleString('ar')} سجل من Whop والمبيعات المحلية</div>
              </div>
              <CreditCard size={18} color="#397db7" />
            </div>
            <PaymentsTable payments={allPayments} />
          </section>
        ) : !payments.isLoading && (
          <section className="panel">
            <div className="empty-state">
              <div className="empty-icon"><CreditCard size={22} /></div>
              <h3>لا توجد مبيعات مسجلة حالياً</h3>
              <p>{whopUnavailable ? 'مزامنة Whop متوقفة ولا توجد معاملات محلية محفوظة لعرضها.' : 'ستظهر هنا مبيعات Whop أو المعاملات المحلية عند توفرها.'}</p>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
