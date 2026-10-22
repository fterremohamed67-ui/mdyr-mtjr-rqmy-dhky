import { useEffect, useState, type FormEvent } from 'react';
import { useGetWhopStatus, getGetWhopStatusQueryKey, useHealthCheck, getHealthCheckQueryKey } from '@workspace/api-client-react';
import type { IntegrationStatus } from '@workspace/api-client-react';
import { Activity, Bot, Check, CircleDollarSign, Copy, Facebook, Globe, Instagram, KeyRound, MessageCircle, Music2, QrCode, Store, X, Youtube } from 'lucide-react';
import { integrationStatusLabel } from '../lib/integration-status';

const integrationDetails = [
  { key: 'whop', name: 'Whop', icon: Store },
  { key: 'whatsapp', name: 'واتساب', icon: MessageCircle },
  { key: 'binance', name: 'Binance', icon: CircleDollarSign },
  { key: 'ai', name: 'المساعد الذكي', icon: Bot },
] as const;

const marketingPlatforms = [
  { key: 'tiktok', name: 'TikTok', icon: Music2, placeholder: 'https://www.tiktok.com/@yourhandle' },
  { key: 'youtube', name: 'YouTube', icon: Youtube, placeholder: 'https://www.youtube.com/@yourchannel' },
  { key: 'facebook', name: 'Facebook', icon: Facebook, placeholder: 'https://facebook.com/yourpage' },
  { key: 'instagram', name: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/yourprofile' },
  { key: 'googleSite', name: 'Google Site / الموقع', icon: Globe, placeholder: 'https://sites.google.com/view/yourstore' },
] as const;

type MarketingPlatformKey = typeof marketingPlatforms[number]['key'];
type MarketingLinks = Record<MarketingPlatformKey, string>;

const whatsappStorageKey = 'whatsapp_service_settings';
const binanceStorageKey = 'binance_service_settings';

type WhatsAppSettings = {
  sessionApi: string;
  webhookUrl: string;
  deviceName: string;
};

type BinanceSettings = {
  apiKey: string;
  secretKey: string;
  merchantId: string;
  paymentUrl: string;
};

const defaultWhatsAppSettings: WhatsAppSettings = {
  sessionApi: '',
  webhookUrl: '',
  deviceName: 'متجر ذكي',
};

const defaultBinanceSettings: BinanceSettings = {
  apiKey: '',
  secretKey: '',
  merchantId: '',
  paymentUrl: '',
};

function getServiceState(data: IntegrationStatus | undefined, service: typeof integrationDetails[number]['key']) {
  if (!data) {
    return undefined;
  }
  return data[service];
}

function readStorageValue<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const value = window.localStorage.getItem(key);
  if (!value) return fallback;
  return JSON.parse(value) as T;
}

function makeQrPreview(seed: string) {
  const size = 11;
  const cells = Array.from({ length: size * size }, (_, index) => {
    const row = Math.floor(index / size);
    const col = index % size;
    const border = row === 0 || col === 0 || row === size - 1 || col === size - 1;
    const seedValue = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const pattern = ((row * 7 + col * 13 + seedValue) % 5) === 0;
    return border || pattern;
  });

  return (
    <div className="qr-code-grid" aria-label="معاينة QR واتساب">
      {cells.map((filled, index) => (
        <span key={index} className={filled ? 'is-filled' : 'is-empty'} />
      ))}
    </div>
  );
}

export function IntegrationStatusPanel({ compact = false, showMarketingPlatforms = false }: { compact?: boolean; showMarketingPlatforms?: boolean }) {
  const whopStatus = useGetWhopStatus({ query: { queryKey: getGetWhopStatusQueryKey() } });
  const health = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey() } });
  const [whatsAppSettings, setWhatsAppSettings] = useState<WhatsAppSettings>(defaultWhatsAppSettings);
  const [savedWhatsAppSettings, setSavedWhatsAppSettings] = useState<WhatsAppSettings>(defaultWhatsAppSettings);
  const [binanceSettings, setBinanceSettings] = useState<BinanceSettings>(defaultBinanceSettings);
  const [savedBinanceSettings, setSavedBinanceSettings] = useState<BinanceSettings>(defaultBinanceSettings);
  const [activeModal, setActiveModal] = useState<'whop' | 'whatsapp' | 'binance' | 'ai' | MarketingPlatformKey | null>(null);
  const [whopCompanyId, setWhopCompanyId] = useState('');
  const [savedWhopCompanyId, setSavedWhopCompanyId] = useState('');
  const [whopStoreUrl, setWhopStoreUrl] = useState('');
  const [savedWhopStoreUrl, setSavedWhopStoreUrl] = useState('');
  const [savedMarketingLinks, setSavedMarketingLinks] = useState<MarketingLinks>({
    tiktok: '',
    youtube: '',
    facebook: '',
    instagram: '',
    googleSite: '',
  });
  const [marketingUrlDraft, setMarketingUrlDraft] = useState('');
  const [notice, setNotice] = useState('');
  const [storageError, setStorageError] = useState('');

  useEffect(() => {
    try {
      const whatsappValue = readStorageValue<Partial<WhatsAppSettings>>(whatsappStorageKey, {});
      const binanceValue = readStorageValue<Partial<BinanceSettings>>(binanceStorageKey, {});
      const storedWhatsApp: WhatsAppSettings = {
        sessionApi: typeof whatsappValue.sessionApi === 'string' ? whatsappValue.sessionApi : '',
        webhookUrl: typeof whatsappValue.webhookUrl === 'string' ? whatsappValue.webhookUrl : '',
        deviceName: typeof whatsappValue.deviceName === 'string' ? whatsappValue.deviceName : defaultWhatsAppSettings.deviceName,
      };
      const storedBinance: BinanceSettings = {
        apiKey: typeof binanceValue.apiKey === 'string' ? binanceValue.apiKey : '',
        secretKey: typeof binanceValue.secretKey === 'string' ? binanceValue.secretKey : '',
        merchantId: typeof binanceValue.merchantId === 'string' ? binanceValue.merchantId : '',
        paymentUrl: typeof binanceValue.paymentUrl === 'string' ? binanceValue.paymentUrl : '',
      };
      setWhatsAppSettings(storedWhatsApp);
      setSavedWhatsAppSettings(storedWhatsApp);
      setBinanceSettings(storedBinance);
      setSavedBinanceSettings(storedBinance);
      const whopValue = readStorageValue<{ companyId?: unknown; storeUrl?: unknown }>('whop_service_settings', {});
      setWhopCompanyId(typeof whopValue.companyId === 'string' ? whopValue.companyId : '');
      setSavedWhopCompanyId(typeof whopValue.companyId === 'string' ? whopValue.companyId : '');
      setWhopStoreUrl(typeof whopValue.storeUrl === 'string' ? whopValue.storeUrl : '');
      setSavedWhopStoreUrl(typeof whopValue.storeUrl === 'string' ? whopValue.storeUrl : '');
      const storedProfile = readStorageValue<Partial<MarketingLinks>>('store_profile', {});
      const storedMarketingLinks: MarketingLinks = {
        tiktok: typeof storedProfile.tiktok === 'string' ? storedProfile.tiktok : '',
        youtube: typeof storedProfile.youtube === 'string' ? storedProfile.youtube : '',
        facebook: typeof storedProfile.facebook === 'string' ? storedProfile.facebook : '',
        instagram: typeof storedProfile.instagram === 'string' ? storedProfile.instagram : '',
        googleSite: typeof storedProfile.googleSite === 'string' ? storedProfile.googleSite : '',
      };
      setSavedMarketingLinks(storedMarketingLinks);
    } catch {
      setStorageError('تعذر تحميل إعدادات الخدمات المحفوظة. تحقق من بيانات التخزين المحلية.');
    }
  }, []);

  const whatsappConfigured = Boolean(savedWhatsAppSettings.sessionApi.trim() || savedWhatsAppSettings.webhookUrl.trim());
  const binanceConfigured = Boolean(savedBinanceSettings.apiKey.trim() && savedBinanceSettings.secretKey.trim());

  const whatsappStatus = whatsappConfigured
    ? { label: 'متصل', tone: 'success' }
    : { label: 'غير متاح', tone: 'neutral' };

  const binanceStatus = binanceConfigured
    ? { label: 'متصل / مفعل', tone: 'success' }
    : { label: 'غير متاح', tone: 'neutral' };

  function saveWhatsAppSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      window.localStorage.setItem(whatsappStorageKey, JSON.stringify(whatsAppSettings));
    } catch {
      setNotice('');
      setStorageError('تعذر حفظ إعدادات واتساب في هذا المتصفح.');
      return;
    }
    setSavedWhatsAppSettings(whatsAppSettings);
    setStorageError('');
    setNotice('تم حفظ إعدادات واتساب بنجاح.');
    setActiveModal(null);
  }

  function saveBinanceSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      window.localStorage.setItem(binanceStorageKey, JSON.stringify(binanceSettings));
    } catch {
      setNotice('');
      setStorageError('تعذر حفظ مفاتيح Binance في هذا المتصفح.');
      return;
    }
    setSavedBinanceSettings(binanceSettings);
    setStorageError('');
    setNotice('تم حفظ مفاتيح Binance بنجاح.');
    setActiveModal(null);
  }

  function saveWhopSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      window.localStorage.setItem('whop_service_settings', JSON.stringify({ companyId: whopCompanyId, storeUrl: whopStoreUrl }));
    } catch {
      setNotice('');
      setStorageError('تعذر حفظ معلومات Whop في هذا المتصفح.');
      return;
    }
    setSavedWhopCompanyId(whopCompanyId);
    setSavedWhopStoreUrl(whopStoreUrl);
    setStorageError('');
    setNotice('تم حفظ معلومات Whop محلياً. يلزم ضبط WHOP_COMPANY_ID وصلاحيات التكامل على الخادم لتفعيل المزامنة.');
    setActiveModal(null);
  }

  function handleWhatsAppInput(field: keyof WhatsAppSettings, value: string) {
    setWhatsAppSettings((current) => ({ ...current, [field]: value }));
    setNotice('');
  }

  function handleBinanceInput(field: keyof BinanceSettings, value: string) {
    setBinanceSettings((current) => ({ ...current, [field]: value }));
    setNotice('');
  }

  async function copyServiceLink(link: string, serviceName: string) {
    try {
      await navigator.clipboard.writeText(link);
      setNotice(`تم نسخ رابط ${serviceName}.`);
      setStorageError('');
    } catch {
      setNotice('');
      setStorageError('تعذر نسخ الرابط. تحقق من إذن الحافظة في المتصفح.');
    }
  }

  function saveMarketingUrl(event: FormEvent<HTMLFormElement>, key: MarketingPlatformKey) {
    event.preventDefault();
    const value = marketingUrlDraft.trim();
    if (value) {
      let url: URL;
      try {
        url = new URL(value);
      } catch {
        setStorageError('أدخل رابطاً صالحاً يبدأ بـ https:// أو http://.');
        return;
      }
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        setStorageError('يجب أن يبدأ رابط المنصة بـ https:// أو http://.');
        return;
      }
      const nextLinks = { ...savedMarketingLinks, [key]: url.href };
      try {
        const currentProfile = readStorageValue<Record<string, unknown>>('store_profile', {});
        window.localStorage.setItem('store_profile', JSON.stringify({ ...currentProfile, [key]: url.href }));
      } catch {
        setStorageError('تعذر حفظ رابط المنصة في هذا المتصفح.');
        return;
      }
      setSavedMarketingLinks(nextLinks);
    } else {
      const nextLinks = { ...savedMarketingLinks, [key]: '' };
      try {
        const currentProfile = readStorageValue<Record<string, unknown>>('store_profile', {});
        window.localStorage.setItem('store_profile', JSON.stringify({ ...currentProfile, [key]: '' }));
      } catch {
        setStorageError('تعذر حذف رابط المنصة من التخزين المحلي.');
        return;
      }
      setSavedMarketingLinks(nextLinks);
    }
    setStorageError('');
    setNotice('تم حفظ رابط المنصة بنجاح.');
    setActiveModal(null);
  }

  function serviceAction(key: typeof integrationDetails[number]['key'] | MarketingPlatformKey, status: { label: string; tone: string }) {
    if (key === 'whatsapp' || key === 'binance') {
      const configured = key === 'whatsapp' ? whatsappConfigured : binanceConfigured;
      const copyLink = key === 'whatsapp'
        ? savedWhatsAppSettings.webhookUrl
        : savedBinanceSettings.paymentUrl;
      return (
        <div className="integration-row-actions">
          <button
            className={`service-action-button ${configured ? 'is-connected' : ''}`}
            type="button"
            onClick={() => {
              setWhatsAppSettings(savedWhatsAppSettings);
              setBinanceSettings(savedBinanceSettings);
              setActiveModal(key);
            }}
            aria-label={`${configured ? 'إدارة إعدادات' : 'إعداد'} ${key === 'whatsapp' ? 'واتساب' : 'Binance Pay'}`}
          >
            {configured ? <><Check size={13} /> متصل 🟢 · إدارة</> : `${status.label} · إعداد`}
          </button>
          {configured && copyLink.trim() && (
            <button className="integration-copy-link" type="button" onClick={() => void copyServiceLink(copyLink, key === 'whatsapp' ? 'واتساب' : 'Binance Pay')}>
              <Copy size={13} /> نسخ الرابط
            </button>
          )}
        </div>
      );
    }
    const marketingPlatform = marketingPlatforms.find((platform) => platform.key === key);
    if (marketingPlatform) {
      const link = savedMarketingLinks[marketingPlatform.key];
      return (
        <div className="integration-row-actions">
          <button
            className={`service-action-button ${link ? 'is-connected' : ''}`}
            type="button"
            onClick={() => {
              setMarketingUrlDraft(link);
              setActiveModal(marketingPlatform.key);
            }}
            aria-label={`${link ? 'تعديل رابط' : 'إعداد'} ${marketingPlatform.name}`}
          >
            {link ? <><Check size={13} /> متصل 🟢 · تعديل</> : 'إضافة رابط'}
          </button>
          {link && (
            <button className="integration-copy-link" type="button" onClick={() => void copyServiceLink(link, marketingPlatform.name)}>
              <Copy size={13} /> نسخ الرابط
            </button>
          )}
        </div>
      );
    }
    if (key === 'whop' || key === 'ai') {
      return (
        <div className="integration-row-actions">
          <button
            className={`service-action-button ${key === 'whop' && status.label === 'متصل' ? 'is-connected' : ''}`}
            type="button"
            onClick={() => {
              if (key === 'whop') {
                setWhopCompanyId(savedWhopCompanyId);
                setWhopStoreUrl(savedWhopStoreUrl);
              }
              setActiveModal(key);
            }}
          >
            {status.label === 'متصل' ? 'متصل 🟢 · تفاصيل' : `${status.label} · تفاصيل`}
          </button>
          {key === 'whop' && savedWhopStoreUrl && (
            <button className="integration-copy-link" type="button" onClick={() => void copyServiceLink(savedWhopStoreUrl, 'Whop')}>
              <Copy size={13} /> نسخ الرابط
            </button>
          )}
        </div>
      );
    }
    return (
      <span className={`status-pill ${status.tone}`}>{status.label}</span>
    );
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">حالة الخدمات</h2>
          <div className="panel-subtitle">الحالات الحالية من واجهة التكاملات</div>
        </div>
        <Activity size={17} color="#4c8fc1" />
      </div>
      {!compact && (whopStatus.isError || storageError) && (
        <div className="banner info" style={{ margin: '0 20px 12px' }} role="status">
          {storageError || 'تعذر قراءة حالة الخدمات من الخادم. لم يتم تأكيد حالة Whop أو المساعد الذكي.'}
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
      {!whopStatus.isLoading && (
        <div className="integration-list">
          {integrationDetails.map(({ key, name, icon: Icon }) => {
            const state = getServiceState(whopStatus.data, key);
            const status = key === 'whatsapp'
              ? whatsappStatus
              : key === 'binance'
                ? binanceStatus
                : integrationStatusLabel(state);
            return (
              <div className="integration-row integration-row-configurable" key={key} data-testid={`status-integration-${key}`}>
                <div className="integration-icon"><Icon size={17} /></div>
                <div className="integration-copy">
                  <strong>{name}</strong>
                  {!compact && (
                    <span>
                      {key === 'ai'
                        ? 'حالة الخدمة من الخادم؛ استخدام الذكاء الاصطناعي متوقف وفق اختيارك المجاني.'
                        : key === 'whop'
                          ? 'حالة الحساب والكتالوج من Whop.'
                          : key === 'whatsapp'
                            ? 'إعدادات واتساب محلية ووضع الربط متاح مباشرة.'
                            : 'إعدادات الدفع بالعملة الرقمية محفوظة محلياً.'}
                    </span>
                  )}
                </div>
                {serviceAction(key, status)}
              </div>
            );
          })}
          {showMarketingPlatforms && marketingPlatforms.map(({ key, name, icon: Icon }) => (
            <div className="integration-row integration-row-configurable" key={key} data-testid={`status-platform-${key}`}>
              <div className="integration-icon"><Icon size={17} /></div>
              <div className="integration-copy">
                <strong>{name}</strong>
                {!compact && <span>إدارة رابط المنصة وحفظه محلياً على هذا الجهاز.</span>}
              </div>
              {serviceAction(key, { label: 'غير متاح', tone: 'neutral' })}
            </div>
          ))}
        </div>
      )}
      {!compact && (
        <>
          {notice && (
            <div className="banner info" style={{ margin: '0 20px 14px' }} role="status">
              <Activity size={15} />
              <span>{notice}</span>
            </div>
          )}
        </>
      )}

      {!compact && activeModal === 'whatsapp' && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveModal(null); }}>
          <div className="modal-card service-modal" role="dialog" aria-modal="true" aria-label="ربط واتساب">
            <div className="modal-head">
              <div>
                <h2>ربط واتساب</h2>
                <p>أدخل بيانات الجلسة والرابط، ثم احفظ الإعدادات على هذا الجهاز.</p>
              </div>
              <button className="btn-quiet" type="button" onClick={() => { setWhatsAppSettings(savedWhatsAppSettings); setActiveModal(null); }} aria-label="إغلاق">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={saveWhatsAppSettings}>
              <div className="service-field">
                <label htmlFor="whatsapp-session-api">Session API / رمز الجلسة</label>
                <input id="whatsapp-session-api" value={whatsAppSettings.sessionApi} onChange={(event) => handleWhatsAppInput('sessionApi', event.target.value)} placeholder="https://api.whatsapp.com/..." />
              </div>
              <div className="service-field">
                <label htmlFor="whatsapp-webhook-url">Webhook URL</label>
                <input id="whatsapp-webhook-url" type="url" dir="ltr" value={whatsAppSettings.webhookUrl} onChange={(event) => handleWhatsAppInput('webhookUrl', event.target.value)} placeholder="https://your-domain.example/webhook/whatsapp" />
              </div>
              <div className="service-field">
                <label htmlFor="whatsapp-device-name">اسم الجهاز</label>
                <input id="whatsapp-device-name" value={whatsAppSettings.deviceName} onChange={(event) => handleWhatsAppInput('deviceName', event.target.value)} placeholder="متجر ذكي - فرع الرياض" />
              </div>
              <div className="qr-connect-layout">
                <div className="qr-code-card">
                  {makeQrPreview(whatsAppSettings.sessionApi || whatsAppSettings.deviceName || 'whatsapp-connect')}
                </div>
                <p className="qr-preview-note">معاينة شكلية لرمز QR فقط؛ يلزم مزود WhatsApp API لإنشاء رمز ربط صالح للمسح.</p>
              </div>
              <div className="modal-actions">
                <button className="btn-primary" type="submit">
                  حفظ وإغلاق
                </button>
                <button className="btn-secondary" type="button" onClick={() => { setWhatsAppSettings(savedWhatsAppSettings); setActiveModal(null); }}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!compact && activeModal === 'binance' && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveModal(null); }}>
          <div className="modal-card service-modal" role="dialog" aria-modal="true" aria-label="إعداد Binance Pay">
            <div className="modal-head">
              <div>
                <h2>إعداد Binance Pay</h2>
                <p>تحفظ المفاتيح محلياً في هذا المتصفح ولا يتم التحقق منها لدى Binance.</p>
              </div>
              <button className="btn-quiet" type="button" onClick={() => { setBinanceSettings(savedBinanceSettings); setActiveModal(null); }} aria-label="إغلاق">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={saveBinanceSettings}>
              <div className="service-field">
                <label htmlFor="binance-api-key">Binance API Key</label>
                <input id="binance-api-key" autoComplete="off" value={binanceSettings.apiKey} onChange={(event) => handleBinanceInput('apiKey', event.target.value)} placeholder="API Key" />
              </div>
              <div className="service-field">
                <label htmlFor="binance-secret-key">Binance Secret Key</label>
                <input id="binance-secret-key" type="password" autoComplete="new-password" value={binanceSettings.secretKey} onChange={(event) => handleBinanceInput('secretKey', event.target.value)} placeholder="Secret Key" />
              </div>
              <div className="service-field">
                <label htmlFor="binance-merchant-id">Merchant ID / Account ID</label>
                <input id="binance-merchant-id" value={binanceSettings.merchantId} onChange={(event) => handleBinanceInput('merchantId', event.target.value)} placeholder="merchant_123456" />
              </div>
              <div className="service-field">
                <label htmlFor="binance-payment-url">رابط الدفع (اختياري لنسخه من القائمة)</label>
                <input id="binance-payment-url" type="url" dir="ltr" value={binanceSettings.paymentUrl} onChange={(event) => handleBinanceInput('paymentUrl', event.target.value)} placeholder="https://..." />
              </div>
              <div className="modal-actions">
                <button className="btn-primary" type="submit">
                  حفظ وإغلاق
                </button>
                <button className="btn-secondary" type="button" onClick={() => { setBinanceSettings(savedBinanceSettings); setActiveModal(null); }}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {!compact && activeModal === 'whop' && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveModal(null); }}>
          <div className="modal-card service-modal" role="dialog" aria-modal="true" aria-label="إعداد Whop">
            <div className="modal-head">
              <div><h2>إعداد Whop</h2><p>يمكن حفظ بيانات المتجر هنا للرجوع إليها؛ يتطلب تفعيل المزامنة ضبط الشركة والصلاحيات على الخادم.</p></div>
              <button className="btn-quiet" type="button" onClick={() => { setWhopCompanyId(savedWhopCompanyId); setWhopStoreUrl(savedWhopStoreUrl); setActiveModal(null); }} aria-label="إغلاق"><X size={16} /></button>
            </div>
            <form onSubmit={saveWhopSettings}>
              <div className="service-field">
                <label htmlFor="whop-company-id">Whop Company ID</label>
                <input id="whop-company-id" value={whopCompanyId} onChange={(event) => setWhopCompanyId(event.target.value)} placeholder="biz_..." />
              </div>
              <div className="service-field">
                <label htmlFor="whop-store-url">رابط المتجر</label>
                <input id="whop-store-url" type="url" dir="ltr" value={whopStoreUrl} onChange={(event) => setWhopStoreUrl(event.target.value)} placeholder="https://whop.com/mystore" />
              </div>
              <p className="service-modal-note">لا يُرسل Company ID أو الرابط إلى الخادم من هذا النموذج. يلزم ضبط <code>WHOP_COMPANY_ID</code> وصلاحية <code>company:basic:read</code> في إعدادات الخادم.</p>
              <div className="modal-actions">
                <button className="btn-primary" type="submit">حفظ وإغلاق</button>
                <button className="btn-secondary" type="button" onClick={() => { setWhopCompanyId(savedWhopCompanyId); setWhopStoreUrl(savedWhopStoreUrl); setActiveModal(null); }}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {!compact && activeModal === 'ai' && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveModal(null); }}>
          <div className="modal-card service-modal" role="dialog" aria-modal="true" aria-label="إعداد المساعد الذكي">
            <div className="modal-head">
              <div><h2>إعداد المساعد الذكي</h2><p>إعداد المزوّد محمي على الخادم.</p></div>
              <button className="btn-quiet" type="button" onClick={() => setActiveModal(null)} aria-label="إغلاق"><X size={16} /></button>
            </div>
            <div className="banner info"><Bot size={16} /><div>لا تُدخل مفاتيح API في المتصفح. يضبط مسؤول الخادم مفتاح المزوّد وحالة الخدمة في متغيرات البيئة الآمنة.</div></div>
            <div className="modal-actions"><button className="btn-primary" type="button" onClick={() => setActiveModal(null)}>إغلاق</button></div>
          </div>
        </div>
      )}
      {!compact && showMarketingPlatforms && activeModal && activeModal !== 'whatsapp' && activeModal !== 'binance' && (() => {
        if (activeModal === 'whop' || activeModal === 'ai') return null;
        const platform = marketingPlatforms.find((item) => item.key === activeModal);
        if (!platform) return null;
        const PlatformIcon = platform.icon;
        return (
          <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveModal(null); }}>
            <div className="modal-card service-modal" role="dialog" aria-modal="true" aria-label={`إعداد ${platform.name}`}>
              <div className="modal-head">
                <div>
                  <h2>إعداد {platform.name}</h2>
                  <p>أضف أو حدّث رابط حسابك العام. يظل الرابط محفوظاً محلياً على هذا الجهاز.</p>
                </div>
                <button className="btn-quiet" type="button" onClick={() => setActiveModal(null)} aria-label="إغلاق"><X size={16} /></button>
              </div>
              <form onSubmit={(event) => saveMarketingUrl(event, platform.key)}>
                <div className="service-field">
                  <label htmlFor={`marketing-url-${platform.key}`}><PlatformIcon size={15} /> رابط {platform.name}</label>
                  <input
                    id={`marketing-url-${platform.key}`}
                    type="url"
                    dir="ltr"
                    value={marketingUrlDraft}
                    onChange={(event) => { setMarketingUrlDraft(event.target.value); setStorageError(''); }}
                    placeholder={platform.placeholder}
                  />
                </div>
                <div className="modal-actions">
                  <button className="btn-primary" type="submit">حفظ وإغلاق</button>
                  <button className="btn-secondary" type="button" onClick={() => setActiveModal(null)}>إلغاء</button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

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
