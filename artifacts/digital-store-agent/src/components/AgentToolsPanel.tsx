import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDeleteAgentAsset, useListAgentAssets, getListAgentAssetsQueryKey, type AgentAsset } from '@workspace/api-client-react';
import { Clipboard, ExternalLink, FileUp, Link2, Trash2, UserRoundPlus } from 'lucide-react';
import { ErrorState, getErrorMessage } from './Shared';

type AgentToolsPanelProps = { registrationRequest: number };

export function AgentToolsPanel({ registrationRequest }: AgentToolsPanelProps) {
  const queryClient = useQueryClient();
  const assets = useListAgentAssets();
  const deleteAsset = useDeleteAgentAsset();
  const [isUploading, setIsUploading] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [siteUrl, setSiteUrl] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [registrationReady, setRegistrationReady] = useState(false);
  const [status, setStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (registrationRequest > 0) setRegistrationOpen(true);
  }, [registrationRequest]);

  async function uploadAsset(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    if (file.size === 0 || file.size > 20 * 1024 * 1024) {
      setStatus('يجب أن يكون الملف أكبر من صفر وألا يتجاوز 20 ميغابايت.');
      return;
    }

    setStatus('');
    setIsUploading(true);
    try {
      const response = await fetch('/api/agent/assets', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Asset-Name': encodeURIComponent(file.name),
          'X-Asset-Type': file.type || 'application/octet-stream',
        },
        body: file,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error || `HTTP ${response.status}`);
      }
      const uploaded = await response.json() as AgentAsset;
      await queryClient.invalidateQueries({ queryKey: getListAgentAssetsQueryKey() });
      setStatus(`تم رفع ${uploaded.name} وإنشاء رابط مشاركة.`);
    } catch (error) {
      setStatus(`تعذر رفع الملف. ${getErrorMessage(error)}`);
    } finally {
      setIsUploading(false);
    }
  }

  function removeAsset(assetId: string) {
    deleteAsset.mutate({ id: assetId }, {
      onSuccess: async () => queryClient.invalidateQueries({ queryKey: getListAgentAssetsQueryKey() }),
      onError: (error) => setStatus(`تعذر حذف الأصل. ${getErrorMessage(error)}`),
    });
  }

  function prepareRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('');
    try {
      const url = new URL(siteUrl);
      if (url.protocol !== 'https:') throw new Error('استخدم رابط HTTPS آمن للموقع.');
      if (!consent) throw new Error('أكد موافقتك قبل متابعة التسجيل.');
      setSiteUrl(url.toString());
      setRegistrationReady(true);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'رابط الموقع غير صالح.');
    }
  }

  async function copyRegistrationDetails() {
    try {
      await navigator.clipboard.writeText(`${fullName}\n${email}`);
      setStatus('نُسخ الاسم والبريد إلى الحافظة.');
    } catch {
      setStatus('تعذر النسخ. يمكنك تحديد البيانات ونسخها يدوياً.');
    }
  }

  function resetRegistration() {
    setSiteUrl('');
    setFullName('');
    setEmail('');
    setConsent(false);
    setRegistrationReady(false);
    setStatus('مُسحت بيانات التسجيل من النموذج.');
  }

  return (
    <section className="panel assistant-tools-panel" aria-labelledby="assistant-tools-title">
      <header className="assistant-tools-header">
        <span className="assistant-section-label"><Link2 size={14} /> الأدوات والروابط</span>
        <h3 id="assistant-tools-title">أصول متجرك</h3>
        <p>ارفعي ملفاً لإنشاء رابط مشاركة، أو أعدّي بيانات التسجيل بمراجعتك.</p>
      </header>

      <div className="agent-asset-actions">
        <button className="btn-secondary" type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} data-testid="button-upload-agent-asset">
          <FileUp size={15} /> {isUploading ? 'جارٍ الرفع…' : 'رفع أصل رقمي'}
        </button>
        <input ref={fileInputRef} className="agent-file-input" type="file" onChange={(event) => void uploadAsset(event)} aria-label="اختر أصلاً رقمياً لرفعه" />
        <button className="btn-quiet" type="button" onClick={() => setRegistrationOpen((open) => !open)} aria-expanded={registrationOpen} data-testid="button-open-registration-form">
          <UserRoundPlus size={15} /> تجهيز تسجيل
        </button>
      </div>

      {assets.isLoading && <p className="agent-tools-muted">جارٍ تحميل الأصول…</p>}
      {assets.isError && <ErrorState message={`تعذر تحميل الأصول. ${getErrorMessage(assets.error)}`} onRetry={() => assets.refetch()} />}
      {assets.data && assets.data.length > 0 && (
        <ul className="agent-asset-list" aria-label="الأصول المرفوعة">
          {assets.data.map((asset) => (
            <li className="agent-asset-row" key={asset.id}>
              <a href={asset.downloadUrl} target="_blank" rel="noreferrer" title={asset.name} data-testid={`link-agent-asset-${asset.id}`}>
                <ExternalLink size={14} /> <span>{asset.name}</span>
              </a>
              <button className="btn-quiet" type="button" onClick={() => removeAsset(asset.id)} disabled={deleteAsset.isPending} aria-label={`حذف ${asset.name}`} title="حذف الأصل">
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {registrationOpen && (
        <form className="agent-registration-form" onSubmit={prepareRegistration}>
          <h4>بيانات محدودة للتسجيل</h4>
          <p>لا تدخلي كلمات مرور أو بيانات مالية أو أرقام هوية. تبقى هذه البيانات في النموذج ولا تُرسل إلى روبي أو الخادم.</p>
          <div className="form-field">
            <label htmlFor="registration-site-url">رابط التسجيل</label>
            <input id="registration-site-url" type="url" inputMode="url" autoComplete="url" placeholder="https://example.com/sign-up" value={siteUrl} onChange={(event) => { setSiteUrl(event.target.value); setRegistrationReady(false); }} required />
          </div>
          <div className="form-field">
            <label htmlFor="registration-full-name">الاسم</label>
            <input id="registration-full-name" autoComplete="name" maxLength={120} value={fullName} onChange={(event) => { setFullName(event.target.value); setRegistrationReady(false); }} required />
          </div>
          <div className="form-field">
            <label htmlFor="registration-email">البريد الإلكتروني</label>
            <input id="registration-email" type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => { setEmail(event.target.value); setRegistrationReady(false); }} required />
          </div>
          <label className="agent-registration-consent">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required />
            <span>أوافق على فتح هذا الموقع وإدخال الاسم والبريد بنفسي.</span>
          </label>
          {!registrationReady ? (
            <button className="btn-primary" type="submit" data-testid="button-prepare-registration">مراجعة وتجهيز الرابط</button>
          ) : (
            <div className="agent-registration-ready">
              <div><strong>{fullName}</strong><span>{email}</span></div>
              <div className="agent-registration-actions">
                <button className="btn-secondary" type="button" onClick={() => void copyRegistrationDetails()}><Clipboard size={14} /> نسخ البيانات</button>
                <a className="btn-primary" href={siteUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" data-testid="link-open-registration-site">
                  <ExternalLink size={14} /> فتح الموقع
                </a>
                <button className="btn-quiet" type="button" onClick={resetRegistration}>مسح البيانات</button>
              </div>
            </div>
          )}
        </form>
      )}
      {status && <p className="agent-tools-status" role="status">{status}</p>}
    </section>
  );
}
