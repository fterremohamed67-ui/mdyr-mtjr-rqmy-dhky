import { getGetWhopStatusQueryKey, getHealthCheckQueryKey, useGetWhopStatus, useHealthCheck } from '@workspace/api-client-react';
import { Activity, Bot, CircleDollarSign, MessageCircle, Store } from 'lucide-react';

const integrationCopy = {
  whop: { name: 'Whop', description: 'الحساب متصل؛ يلزم تفعيل صلاحية company:basic:read.', icon: Store, status: 'متصل مع صلاحية ناقصة', tone: 'warning' },
  whatsapp: { name: 'واتساب', description: 'لم يتم ربط رقم واتساب بهذا المتجر.', icon: MessageCircle, status: 'غير متصل', tone: 'neutral' },
  binance: { name: 'Binance', description: 'تكامل التحويلات غير متاح حالياً.', icon: CircleDollarSign, status: 'غير متاح', tone: 'neutral' },
  ai: { name: 'المساعد الذكي', description: 'إعداد OpenAI متوقف لحين ترقية الحساب.', icon: Bot, status: 'يتطلب ترقية', tone: 'warning' },
};

export function IntegrationStatusPanel({ compact = false }: { compact?: boolean }) {
  const whopStatus = useGetWhopStatus({ query: { queryKey: getGetWhopStatusQueryKey() } });
  const health = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey() } });
  const items = Object.entries(integrationCopy);
  const whopState = whopStatus.data?.whop;
  const whopDetail = whopState === 'ready'
    ? 'متصل؛ صلاحية الشركة مطلوبة'
    : whopState === 'not_connected'
      ? 'غير متصل'
      : whopState === 'configuration_required'
        ? 'يلزم الإعداد'
        : integrationCopy.whop.status;

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">حالة الخدمات</h2>
          <div className="panel-subtitle">الاتصال الفعلي في الوقت الحالي</div>
        </div>
        <Activity size={17} color="#77917f" />
      </div>
      {!compact && whopStatus.isError && (
        <div className="banner danger" style={{ margin: '0 20px 12px' }}>
          تعذر جلب حالة Whop الآن. المعلومات أدناه تصف حالة الإعداد المعروفة.
        </div>
      )}
      {!compact && health.isError && (
        <div className="banner danger" style={{ margin: '0 20px 12px' }}>
          لم نتمكن من تأكيد حالة الخادم.
        </div>
      )}
      <div className="integration-list">
        {items.map(([key, item]) => {
          const Icon = item.icon;
          const status = key === 'whop' ? whopDetail : item.status;
          const description = key === 'whop' && whopStatus.data?.message ? whopStatus.data.message : item.description;
          return (
            <div className="integration-row" key={key} data-testid={`status-integration-${key}`}>
              <div className="integration-icon"><Icon size={17} /></div>
              <div className="integration-copy">
                <strong>{item.name}</strong>
                {!compact && <span>{description}</span>}
              </div>
              <span className={`status-pill ${item.tone}`}>{status}</span>
            </div>
          );
        })}
        {!compact && (
          <div className="integration-row">
            <div className="integration-icon"><Activity size={17} /></div>
            <div className="integration-copy">
              <strong>واجهة الخدمة</strong>
              <span>{health.data?.status ? `الحالة: ${health.data.status}` : health.isLoading ? 'جارٍ التحقق…' : 'لم يتم التحقق'}</span>
            </div>
            <span className={`status-pill ${health.data?.status === 'ok' ? '' : 'neutral'}`}>{health.data?.status === 'ok' ? 'تعمل' : 'الحالة غير مؤكدة'}</span>
          </div>
        )}
      </div>
    </section>
  );
}
