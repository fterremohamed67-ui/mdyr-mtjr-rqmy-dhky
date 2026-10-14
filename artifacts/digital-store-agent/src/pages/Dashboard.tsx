import { getGetStoreOverviewQueryKey, useGetStoreOverview } from '@workspace/api-client-react';
import { ArrowLeft, CircleDollarSign, CreditCard, Package, Users } from 'lucide-react';
import { Link } from 'wouter';
import { AppShell } from '../components/AppShell';
import { IntegrationStatusPanel } from '../components/IntegrationStatusPanel';
import { PaymentsTable } from '../components/PaymentsTable';
import { ErrorState, LoadingCards, PageHeading, formatMoney } from '../components/Shared';

export function DashboardPage() {
  const overview = useGetStoreOverview({ query: { queryKey: getGetStoreOverviewQueryKey() } });

  return (
    <AppShell>
      <div className="page-content" dir="rtl">
        <PageHeading eyebrow="مساحة العمل" title="نظرة عامة" description="ملخص متجرك من البيانات المتاحة الآن." />
        {overview.isLoading && <LoadingCards />}
        {overview.isError && (
          <div style={{ marginBottom: 20 }}>
            <ErrorState message="تعذر قراءة ملخص المتجر. قد تحتاج صلاحية Whop إلى التفعيل." onRetry={() => overview.refetch()} />
          </div>
        )}
        {overview.data && (
          <>
            <section className="metric-grid" aria-label="ملخص المتجر">
              <article className="panel metric-card" data-testid="metric-revenue">
                <div className="metric-label"><span>الإيرادات المسجلة</span><i className="metric-icon"><CircleDollarSign size={17} /></i></div>
                <div className="metric-value">{formatMoney(overview.data.revenue, overview.data.currency)}</div>
                <div className="metric-foot">القيمة كما أرسلتها خدمة Whop</div>
              </article>
              <article className="panel metric-card" data-testid="metric-payment-count">
                <div className="metric-label"><span>عمليات الدفع</span><i className="metric-icon"><CreditCard size={17} /></i></div>
                <div className="metric-value">{overview.data.paymentCount.toLocaleString('ar')}</div>
                <div className="metric-foot">إجمالي العمليات المسجلة</div>
              </article>
              <article className="panel metric-card" data-testid="metric-customer-count">
                <div className="metric-label"><span>العملاء</span><i className="metric-icon"><Users size={17} /></i></div>
                <div className="metric-value">{overview.data.customerCount.toLocaleString('ar')}</div>
                <div className="metric-foot">عدد العملاء من مصدر المتجر</div>
              </article>
              <article className="panel metric-card" data-testid="metric-product-count">
                <div className="metric-label"><span>المنتجات</span><i className="metric-icon"><Package size={17} /></i></div>
                <div className="metric-value">{overview.data.productCount.toLocaleString('ar')}</div>
                <div className="metric-foot">خطط المنتجات المتاحة</div>
              </article>
            </section>
            {overview.data.integrationState !== 'ready' && (
              <div className="banner" style={{ marginTop: 17 }}>
                <span>!</span>
                <div>
                  <strong>بعض بيانات المتجر قد لا تكون مكتملة</strong>
                  حالة التكامل: {overview.data.integrationState}. تحقق من صلاحيات Whop قبل الاعتماد على هذه القراءة.
                </div>
              </div>
            )}
            <div className="content-grid">
              <section className="panel">
                <div className="panel-head">
                  <div>
                    <h2 className="panel-title">أحدث المدفوعات</h2>
                    <div className="panel-subtitle">آخر السجلات التي أعادتها الخدمة</div>
                  </div>
                  <Link href="/sales" className="btn-quiet" data-testid="link-all-sales">عرض الكل <ArrowLeft size={14} /></Link>
                </div>
                <PaymentsTable payments={overview.data.recentPayments} />
              </section>
              <IntegrationStatusPanel />
            </div>
          </>
        )}
        {!overview.isLoading && overview.isError && (
          <div className="panel" style={{ marginTop: 17 }}>
            <IntegrationStatusPanel />
          </div>
        )}
      </div>
    </AppShell>
  );
}
