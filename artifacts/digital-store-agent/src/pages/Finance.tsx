import { getGetStoreOverviewQueryKey, getListStorePaymentsQueryKey, useGetStoreOverview, useListStorePayments } from '@workspace/api-client-react';
import { ArrowDownToLine, CircleDollarSign, FileClock } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { PaymentsTable } from '../components/PaymentsTable';
import { ErrorState, PageHeading, formatMoney, getErrorMessage } from '../components/Shared';

export function FinancePage() {
  const overview = useGetStoreOverview({ query: { queryKey: getGetStoreOverviewQueryKey() } });
  const payments = useListStorePayments({ query: { queryKey: getListStorePaymentsQueryKey() } });

  return (
    <AppShell>
      <div className="page-content" dir="rtl">
        <PageHeading eyebrow="التدفقات المالية" title="المالية" description="الإيرادات والمدفوعات والتقارير التي توفرها الخدمات المتصلة." />
        <div className="finance-summary">
          <section className="panel finance-box">
            <span>الإيرادات المسجلة من Whop</span>
            <strong>{overview.data ? formatMoney(overview.data.revenue, overview.data.currency) : overview.isLoading ? 'جارٍ التحميل…' : 'غير متاحة'}</strong>
          </section>
          <section className="panel finance-box">
            <span>عمليات الدفع المسجلة</span>
            <strong>{overview.data ? overview.data.paymentCount.toLocaleString('ar') : overview.isLoading ? 'جارٍ التحميل…' : 'غير متاحة'}</strong>
          </section>
        </div>
        {(overview.isError || payments.isError) && (
          <div style={{ marginBottom: 16 }}>
            <ErrorState message={`تعذر تحديث البيانات المالية. ${getErrorMessage(overview.error || payments.error)}`} onRetry={() => { void overview.refetch(); void payments.refetch(); }} />
          </div>
        )}
        <div className="content-grid">
          <section className="panel">
            <div className="panel-head">
              <div><h2 className="panel-title">سجل الدفع</h2><div className="panel-subtitle">المدفوعات التي أعادتها الخدمة فقط</div></div>
              <CircleDollarSign size={18} color="#a85837" />
            </div>
            {payments.isLoading && <div style={{ padding: 22 }}><div className="skeleton" style={{ width: '80%' }} /></div>}
            {payments.data && <PaymentsTable payments={payments.data} />}
            {payments.isError && <div style={{ padding: 18, color: '#8f4e3b', fontSize: 12 }}>تعذر تحميل سجل المدفوعات.</div>}
          </section>
          <section className="panel">
            <div className="panel-head">
              <div><h2 className="panel-title">التحويلات والتقارير</h2><div className="panel-subtitle">حالة عمليات الصرف</div></div>
              <FileClock size={18} color="#a85837" />
            </div>
            <div style={{ padding: '0 20px 20px' }}>
              <div className="banner danger">
                <ArrowDownToLine size={17} />
                <div>
                  <strong>التحويلات غير متاحة</strong>
                  تكامل Binance غير متاح حالياً. لا توجد بيانات تحويل يمكن عرضها أو تصديرها.
                </div>
              </div>
              <div style={{ marginTop: 13, color: '#8a908a', fontSize: 10, lineHeight: 1.8 }}>
                لا يتم إنشاء رصيد أو حالة صرف تقديرية. ستظهر التقارير عند توفر مصدر بيانات موثوق.
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
