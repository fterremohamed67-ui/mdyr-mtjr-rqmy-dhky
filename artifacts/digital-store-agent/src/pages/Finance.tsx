import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { getGetStoreOverviewQueryKey, getGetWhopStatusQueryKey, getListStorePaymentsQueryKey, useGetStoreOverview, useGetWhopStatus, useListStorePayments, type StorePayment } from '@workspace/api-client-react';
import { ArrowDownToLine, CircleDollarSign, FileClock, Plus, RefreshCw } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { PaymentsTable } from '../components/PaymentsTable';
import { ErrorState, PageHeading, formatMoney, getErrorMessage } from '../components/Shared';
import { integrationStatusLabel } from '../lib/integration-status';

const localTransactionsStorageKey = 'local_finance_transactions';

type LocalFinanceTransaction = StorePayment & {
  source: 'local' | 'binance';
};

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('status' in error)) return undefined;
  return typeof error.status === 'number' ? error.status : undefined;
}

function readLocalTransactions(): LocalFinanceTransaction[] {
  try {
    const rawTransactions = window.localStorage.getItem(localTransactionsStorageKey);
    if (!rawTransactions) return [];

    const parsed: unknown = JSON.parse(rawTransactions);
    if (!Array.isArray(parsed)) throw new Error('قائمة المعاملات المحلية غير صالحة.');

    return parsed.filter((transaction): transaction is LocalFinanceTransaction =>
      Boolean(transaction) &&
      typeof transaction === 'object' &&
      typeof transaction.id === 'string' &&
      typeof transaction.amount === 'number' &&
      Number.isFinite(transaction.amount) &&
      typeof transaction.currency === 'string' &&
      typeof transaction.status === 'string' &&
      (transaction.buyerName === null || typeof transaction.buyerName === 'string') &&
      (transaction.productTitle === null || typeof transaction.productTitle === 'string') &&
      (transaction.createdAt === null || typeof transaction.createdAt === 'string') &&
      (transaction.source === 'local' || transaction.source === 'binance'),
    );
  } catch (error) {
    throw error instanceof Error ? error : new Error('تعذر قراءة المعاملات المحلية.');
  }
}

export function FinancePage() {
  const overview = useGetStoreOverview({ query: { queryKey: getGetStoreOverviewQueryKey() } });
  const payments = useListStorePayments({ query: { queryKey: getListStorePaymentsQueryKey() } });
  const services = useGetWhopStatus({ query: { queryKey: getGetWhopStatusQueryKey() } });
  const [localTransactions, setLocalTransactions] = useState<LocalFinanceTransaction[]>([]);
  const [localLoadError, setLocalLoadError] = useState('');
  const [transactionTitle, setTransactionTitle] = useState('');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionCurrency, setTransactionCurrency] = useState('USD');
  const [transactionSource, setTransactionSource] = useState<'local' | 'binance'>('local');
  const [localSaveError, setLocalSaveError] = useState('');
  const [localSaveMessage, setLocalSaveMessage] = useState('');
  const binanceStatus = integrationStatusLabel(services.data?.binance);

  useEffect(() => {
    try {
      setLocalTransactions(readLocalTransactions());
      setLocalLoadError('');
    } catch (error) {
      setLocalLoadError(error instanceof Error ? error.message : 'تعذر قراءة المعاملات المحلية.');
    }
  }, []);

  const whopUnavailable = getErrorStatus(overview.error) === 503 ||
    getErrorStatus(payments.error) === 503 ||
    services.data?.whop === 'configuration_required' ||
    services.data?.whop === 'permissions_required';
  const localRevenueByCurrency = useMemo(() => {
    const totals = new Map<string, number>();
    for (const transaction of localTransactions) {
      if (!['paid', 'succeeded', 'complete', 'completed', 'successful'].includes(transaction.status.toLowerCase())) continue;
      const currency = transaction.currency.toUpperCase();
      totals.set(currency, (totals.get(currency) ?? 0) + transaction.amount);
    }
    return [...totals.entries()].map(([currency, total]) => formatMoney(total, currency)).join(' + ');
  }, [localTransactions]);
  const financePayments = useMemo(() => {
    const allPayments: StorePayment[] = [...localTransactions, ...(payments.data ?? [])];
    return allPayments.sort((first, second) =>
      new Date(second.createdAt ?? 0).getTime() - new Date(first.createdAt ?? 0).getTime(),
    );
  }, [localTransactions, payments.data]);
  const hasLocalTransactions = localTransactions.length > 0;
  const hasServiceErrors = (overview.isError && getErrorStatus(overview.error) !== 503) ||
    (payments.isError && getErrorStatus(payments.error) !== 503);

  function saveLocalTransactions(transactions: LocalFinanceTransaction[]) {
    try {
      window.localStorage.setItem(localTransactionsStorageKey, JSON.stringify(transactions));
      setLocalTransactions(transactions);
      setLocalSaveError('');
      setLocalSaveMessage('تم حفظ المعاملة محلياً.');
      return true;
    } catch {
      setLocalSaveMessage('');
      setLocalSaveError('تعذر حفظ المعاملة في هذا المتصفح. تحقق من مساحة التخزين المتاحة ثم أعد المحاولة.');
      return false;
    }
  }

  function handleAddTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(transactionAmount);
    if (!transactionTitle.trim() || !Number.isFinite(amount) || amount <= 0) {
      setLocalSaveError('أدخل وصفاً ومبلغاً أكبر من صفر.');
      return;
    }

    const sourceLabel = transactionSource === 'binance' ? 'Binance Pay' : 'بيع محلي';
    const newTransaction: LocalFinanceTransaction = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      amount,
      currency: transactionCurrency,
      status: 'paid',
      buyerName: null,
      productTitle: `${transactionTitle.trim()} · ${sourceLabel}`,
      createdAt: new Date().toISOString(),
      source: transactionSource,
    };

    if (saveLocalTransactions([newTransaction, ...localTransactions])) {
      setTransactionTitle('');
      setTransactionAmount('');
    }
  }

  function handleDeleteTransaction(transactionId: string) {
    const nextTransactions = localTransactions.filter((transaction) => transaction.id !== transactionId);
    if (saveLocalTransactions(nextTransactions)) {
      setLocalSaveMessage('تم حذف المعاملة المحلية.');
    }
  }

  return (
    <AppShell>
      <div className="page-content" dir="rtl">
        <PageHeading
          eyebrow="التدفقات المالية"
          title="المالية"
          description="الإيرادات والمدفوعات والتقارير التي توفرها الخدمات المتصلة."
          action={<button className="btn-secondary" type="button" onClick={() => { void overview.refetch(); void payments.refetch(); void services.refetch(); }} disabled={overview.isFetching || payments.isFetching} data-testid="button-refresh-finance"><RefreshCw size={14} /> تحديث البيانات</button>}
        />
        {whopUnavailable && (
          <div className="banner info finance-setup-banner" role="status">
            <CircleDollarSign size={17} />
            <div>
              <strong>بيانات Whop غير متاحة حالياً</strong>
              لا يمكن قراءة سجل Whop بسبب إعداد الشركة أو صلاحيات التكامل. راجع إعداد WHOP_COMPANY_ID وصلاحية company:basic:read على الخادم. ستظل المعاملات المحلية ظاهرة أدناه.
            </div>
          </div>
        )}
        <div className="finance-summary">
          <section className="panel finance-box">
            <span>الإيرادات المسجلة من Whop</span>
            <strong>{overview.data ? formatMoney(overview.data.revenue, overview.data.currency) : overview.isLoading ? 'جارٍ التحميل…' : 'غير متاحة'}</strong>
          </section>
          <section className="panel finance-box">
            <span>عمليات الدفع المسجلة من Whop</span>
            <strong>{overview.data ? overview.data.paymentCount.toLocaleString('ar') : overview.isLoading ? 'جارٍ التحميل…' : 'غير متاحة'}</strong>
          </section>
          <section className="panel finance-box">
            <span>المعاملات المحلية الناجحة</span>
            <strong>{hasLocalTransactions ? localRevenueByCurrency || '—' : 'لا توجد بيانات مالية مسجلة حالياً'}</strong>
            {hasLocalTransactions && <small>{localTransactions.length.toLocaleString('ar')} عملية محلية</small>}
          </section>
        </div>
        {hasServiceErrors && (
          <div style={{ marginBottom: 16 }}>
            <ErrorState
              message={`تعذر تحديث بعض البيانات المالية. ${getErrorMessage((overview.isError && getErrorStatus(overview.error) !== 503 ? overview.error : payments.error) || payments.error)}`}
              onRetry={() => { void overview.refetch(); void payments.refetch(); }}
            />
          </div>
        )}
        {localLoadError && <div className="banner danger" role="alert" style={{ marginBottom: 16 }}>{localLoadError}</div>}
        <div className="content-grid">
          <section className="panel">
            <div className="panel-head">
              <div><h2 className="panel-title">سجل الدفع</h2><div className="panel-subtitle">سجلات Whop والمعاملات المحلية المسجلة</div></div>
              <CircleDollarSign size={18} color="#397db7" />
            </div>
            {financePayments.length === 0 && (payments.isLoading || overview.isLoading) && <div style={{ padding: 22 }}><div className="skeleton" style={{ width: '80%' }} /></div>}
            {financePayments.length > 0 && <PaymentsTable payments={financePayments} />}
            {!payments.isLoading && !overview.isLoading && financePayments.length === 0 && (
              <div className="empty-state">
                <h3>لا توجد بيانات مالية مسجلة حالياً</h3>
                <p>{whopUnavailable ? 'سجل مبيعات محلياً أو تحقق من إعدادات Whop وصلاحيات القراءة.' : 'ستظهر هنا سجلات الدفع عند توفرها من Whop أو عند تسجيل معاملة محلية.'}</p>
              </div>
            )}
          </section>
          <section className="panel">
            <div className="panel-head">
              <div><h2 className="panel-title">التحويلات والتقارير</h2><div className="panel-subtitle">حالة عمليات الصرف</div></div>
              <FileClock size={18} color="#397db7" />
            </div>
            <div style={{ padding: '0 20px 20px' }}>
              <div className="banner">
                <ArrowDownToLine size={17} />
                <div>
                  <strong>حالة تكامل التحويلات</strong>
                  {services.isLoading ? 'جارٍ التحقق من حالة Binance.' : services.isError ? 'تعذر تأكيد الحالة الحالية لـ Binance.' : `الحالة من الخدمة: ${binanceStatus.label}.`}
                </div>
              </div>
              <div style={{ marginTop: 13, color: '#748da2', fontSize: 10, lineHeight: 1.8 }}>
                لا تعرض الواجهة سجلات تحويل من Binance ما لم تُسجل معاملة محلية. لا ننشئ رصيداً أو سجلاً تقديرياً.
              </div>
            </div>
          </section>
        </div>
        <section className="panel local-finance-panel">
          <div className="panel-head">
            <div><h2 className="panel-title">إضافة معاملة محلية</h2><div className="panel-subtitle">تُحفظ على هذا الجهاز فقط، ولا تُرسل إلى Whop أو Binance.</div></div>
            <Plus size={18} color="#397db7" />
          </div>
          <form className="local-finance-form" onSubmit={handleAddTransaction}>
            <div className="form-field">
              <label htmlFor="finance-transaction-title">وصف المعاملة</label>
              <input id="finance-transaction-title" value={transactionTitle} onChange={(event) => { setTransactionTitle(event.target.value); setLocalSaveError(''); }} maxLength={120} placeholder="مثال: مبيعات منتج رقمي" required />
            </div>
            <div className="form-field">
              <label htmlFor="finance-transaction-amount">المبلغ</label>
              <input id="finance-transaction-amount" type="number" min="0.01" step="0.01" value={transactionAmount} onChange={(event) => { setTransactionAmount(event.target.value); setLocalSaveError(''); }} placeholder="0.00" required />
            </div>
            <div className="form-field">
              <label htmlFor="finance-transaction-currency">العملة</label>
              <select id="finance-transaction-currency" value={transactionCurrency} onChange={(event) => setTransactionCurrency(event.target.value)}>
                <option value="USD">USD</option>
                <option value="SAR">SAR</option>
                <option value="AED">AED</option>
                <option value="EUR">EUR</option>
                <option value="USDT">USDT</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="finance-transaction-source">المصدر</label>
              <select id="finance-transaction-source" value={transactionSource} onChange={(event) => setTransactionSource(event.target.value as 'local' | 'binance')}>
                <option value="local">بيع محلي</option>
                <option value="binance">Binance Pay</option>
              </select>
            </div>
            <button className="btn-primary local-finance-submit" type="submit" data-testid="button-add-finance-transaction"><Plus size={15} /> تسجيل المعاملة</button>
          </form>
          {localSaveMessage && <div className="finance-feedback" role="status">{localSaveMessage}</div>}
          {localSaveError && <div className="finance-feedback error" role="alert">{localSaveError}</div>}
          {localTransactions.length > 0 && (
            <div className="local-transaction-list">
              {localTransactions.map((transaction) => (
                <div className="local-transaction-item" key={transaction.id}>
                  <span>{transaction.productTitle}</span>
                  <strong>{formatMoney(transaction.amount, transaction.currency)}</strong>
                  <button className="btn-quiet" type="button" onClick={() => handleDeleteTransaction(transaction.id)} aria-label={`حذف ${transaction.productTitle}`} data-testid={`button-delete-finance-${transaction.id}`}>حذف</button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
