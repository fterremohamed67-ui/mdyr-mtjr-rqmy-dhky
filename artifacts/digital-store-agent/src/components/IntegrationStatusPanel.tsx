import { useGetWhopStatus, getGetWhopStatusQueryKey, useHealthCheck, getHealthCheckQueryKey } from '@workspace/api-client-react';
import type { IntegrationStatus } from '@workspace/api-client-react';
import { Activity, Bot, CircleDollarSign, MessageCircle, Store } from 'lucide-react';
import { integrationStatusLabel } from '../lib/integration-status';

const integrationDetails = [
  { key: 'whop', name: 'Whop', icon: Store },
  { key: 'whatsapp', name: 'واتساب', icon: MessageCircle },
  { key: 'binance', name: 'Binance', icon: CircleDollarSign },
  { key: 'ai', name: 'المساعد الذكي', icon: Bot },
] as const;

function getServiceState(data: IntegrationStatus | undefined, service: typeof integrationDetails[number]['key']) {
  if (!data) {
    return undefined;
  }
  return data[service];
}

export function IntegrationStatusPanel({ compact = false }: { compact?: boolean }) {
  const whopStatus = useGetWhopStatus({ query: { queryKey: getGetWhopStatusQueryKey() } });
  const health = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey() } });

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">حالة الخدمات</h2>
          <div className="panel-subtitle">الحالات الحالية من واجهة التكاملات</div>
        </div>
        <Activity size={17} color="#4c8fc1" />
      </div>
      {!compact && whopStatus.isError && (
        <div className="banner danger" style={{ margin: '0 20px 12px' }} role="alert">
          تعذر قراءة حالة التكاملات. لن نفترض أن أي خدمة متصلة.
        </div>
      )}
      {whopStatus.isLoading && (
        <div className="integration-list" aria-label="جارٍ تحميل حالة التكاملات">
          {[0, 1, 2, 3].map((item) => (
            <div className="integration-row" key={item}>
              <div className="skeleton" style={{ width: 34, height: 34 }} />
              <div className="skeleton" style={{ width: '54%' }} />
            </div>
          ))}
        </div>
      )}
      {!whopStatus.isLoading && !whopStatus.isError && (
        <div className="integration-list">
          {integrationDetails.map(({ key, name, icon: Icon }) => {
            const state = getServiceState(whopStatus.data, key);
            const status = integrationStatusLabel(state);
            return (
              <div className="integration-row" key={key} data-testid={`status-integration-${key}`}>
                <div className="integration-icon"><Icon size={17} /></div>
                <div className="integration-copy">
                  <strong>{name}</strong>
                  {!compact && (
                    <span>
                      {key === 'ai'
                        ? 'حالة الخدمة من الخادم؛ استخدام الذكاء الاصطناعي متوقف وفق اختيارك المجاني.'
                        : key === 'whop'
                          ? 'حالة الحساب والكتالوج من Whop.'
                          : 'الحالة كما أعادتها خدمة التكاملات.'}
                    </span>
                  )}
                </div>
                <span className={`status-pill ${status.tone}`}>{status.label}</span>
              </div>
            );
          })}
        </div>
      )}
      {!compact && (
        <div className="integration-list" style={{ paddingTop: 0 }}>
          <div className="integration-row">
            <div className="integration-icon"><Activity size={17} /></div>
            <div className="integration-copy">
              <strong>واجهة الخدمة</strong>
              <span>{health.isLoading ? 'جارٍ التحقق من الاستجابة.' : health.data?.status ? 'تم استلام استجابة من الخادم.' : 'تعذر تأكيد استجابة الخادم.'}</span>
            </div>
            <span className={`status-pill ${health.isError ? 'neutral' : ''}`}>
              {health.isLoading ? 'جارٍ التحقق' : health.isError ? 'غير مؤكدة' : 'تم الفحص'}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
