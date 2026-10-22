import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useUser } from '@clerk/react';
import { Camera, CheckCircle, CircleUserRound, ExternalLink, LogOut, Phone, Plus, Save, ShieldCheck, ShoppingBag, Trash2 } from 'lucide-react';
import { useClerk } from '@clerk/react';
import { AppShell } from '../components/AppShell';
import { IntegrationStatusPanel } from '../components/IntegrationStatusPanel';
import { PageHeading } from '../components/Shared';
import { isLocalPreview } from '../lib/local-preview';

const profileStorageKey = 'store_profile';
const profileAvatarStorageKey = 'user_profile_avatar';
const connectedStoresStorageKey = 'connected_stores';
const maxAvatarFileSize = 2 * 1024 * 1024;

type ConnectedStore = {
  id: string;
  name: string;
  url: string;
};

type StoreProfile = {
  name: string;
  email: string;
  phone: string;
  tiktok: string;
  youtube: string;
  facebook: string;
  instagram: string;
  googleSite: string;
};

const emptyStoreProfile: StoreProfile = {
  name: 'صاحب المتجر',
  email: '',
  phone: '',
  tiktok: '',
  youtube: '',
  facebook: '',
  instagram: '',
  googleSite: '',
};

export function SettingsPage() {
  if (isLocalPreview) {
    return <SettingsContent isLoaded user={null} />;
  }
  return <AuthenticatedSettingsPage />;
}

function AuthenticatedSettingsPage() {
  const { user, isLoaded } = useUser();
  const { openUserProfile, signOut } = useClerk();
  return (
    <SettingsContent
      isLoaded={isLoaded}
      user={user ?? null}
      onOpenProfile={() => openUserProfile()}
      onSignOut={() => signOut({ redirectUrl: import.meta.env.BASE_URL || '/' })}
    />
  );
}

function SettingsContent({
  isLoaded,
  user,
  onOpenProfile,
  onSignOut,
}: {
  isLoaded: boolean;
  user: {
    firstName?: string | null;
    fullName?: string | null;
    primaryEmailAddress?: { emailAddress: string } | null;
    primaryPhoneNumber?: { phoneNumber: string } | null;
  } | null;
  onOpenProfile?: () => void;
  onSignOut?: () => void;
}) {
  const [profile, setProfile] = useState<StoreProfile>(emptyStoreProfile);
  const [profileAvatar, setProfileAvatar] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [connectedStores, setConnectedStores] = useState<ConnectedStore[]>([]);
  const [storeName, setStoreName] = useState('');
  const [storeUrl, setStoreUrl] = useState('');
  const [storeMessage, setStoreMessage] = useState('');
  const [storeError, setStoreError] = useState('');
  const savedMessageTimeout = useRef<number | null>(null);
  const avatarInput = useRef<HTMLInputElement | null>(null);
  const hasLoadedProfile = useRef(false);

  useEffect(() => {
    try {
      const storedAvatar = window.localStorage.getItem(profileAvatarStorageKey);
      if (storedAvatar?.startsWith('data:image/')) {
        setProfileAvatar(storedAvatar);
      } else if (storedAvatar) {
        throw new Error('الصورة الشخصية المحفوظة غير صالحة. اختر صورة جديدة.');
      }
    } catch (error) {
      setAvatarError(error instanceof Error
        ? error.message
        : 'تعذر تحميل الصورة الشخصية من هذا المتصفح.');
    }
  }, []);

  useEffect(() => {
    if (!isLoaded || hasLoadedProfile.current) return;
    hasLoadedProfile.current = true;

    const accountDefaults: StoreProfile = {
      ...emptyStoreProfile,
      name: user?.fullName || emptyStoreProfile.name,
      email: user?.primaryEmailAddress?.emailAddress || '',
      phone: user?.primaryPhoneNumber?.phoneNumber || '',
    };

    try {
      const storedProfile = window.localStorage.getItem(profileStorageKey);
      if (!storedProfile) {
        setProfile(accountDefaults);
        return;
      }

      const parsed: unknown = JSON.parse(storedProfile);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('بيانات الإعدادات المحفوظة غير صالحة.');
      }

      const loadedProfile = { ...accountDefaults };
      for (const key of Object.keys(loadedProfile) as (keyof StoreProfile)[]) {
        const value = (parsed as Record<string, unknown>)[key];
        if (value !== undefined && typeof value !== 'string') {
          throw new Error('بيانات الإعدادات المحفوظة غير صالحة.');
        }
        if (typeof value === 'string') loadedProfile[key] = value;
      }
      setProfile(loadedProfile);
      setSaveError('');
    } catch (error) {
      setProfile(accountDefaults);
      setSaveError(error instanceof Error
        ? error.message
        : 'تعذر تحميل الإعدادات المحفوظة من هذا المتصفح.');
    }
  }, [isLoaded, user]);

  useEffect(() => {
    try {
      const storedStores = window.localStorage.getItem(connectedStoresStorageKey);
      if (!storedStores) return;

      const parsed: unknown = JSON.parse(storedStores);
      if (!Array.isArray(parsed)) {
        throw new Error('قائمة المتاجر المحفوظة غير صالحة.');
      }

      const validStores = parsed.filter((store): store is ConnectedStore =>
        Boolean(store) &&
        typeof store === 'object' &&
        typeof store.id === 'string' &&
        typeof store.name === 'string' &&
        typeof store.url === 'string',
      );
      setConnectedStores(validStores);
    } catch (error) {
      setStoreError(error instanceof Error
        ? error.message
        : 'تعذر تحميل قائمة المتاجر المحفوظة.');
    }
  }, []);

  useEffect(() => () => {
    if (savedMessageTimeout.current !== null) {
      window.clearTimeout(savedMessageTimeout.current);
    }
  }, []);

  function handleProfileChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.currentTarget;
    if (name in profile) {
      setProfile((current) => ({ ...current, [name]: value }));
      setSaveMessage('');
      setSaveError('');
    }
  }

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarError('اختر ملف صورة صالحاً.');
      return;
    }
    if (file.size > maxAvatarFileSize) {
      setAvatarError('يجب ألا يتجاوز حجم الصورة 2 ميغابايت.');
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setAvatarError('تعذرت قراءة الصورة. حاول اختيار ملف آخر.');
    reader.onload = () => {
      if (typeof reader.result !== 'string' || !reader.result.startsWith('data:image/')) {
        setAvatarError('تعذر تحميل الصورة المحددة.');
        return;
      }
      try {
        window.localStorage.setItem(profileAvatarStorageKey, reader.result);
        setProfileAvatar(reader.result);
        setAvatarError('');
      } catch {
        setAvatarError('تعذر حفظ الصورة في هذا المتصفح. اختر صورة أصغر أو أفرغ مساحة التخزين.');
      }
    };
    reader.readAsDataURL(file);
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const storedProfile: unknown = JSON.parse(window.localStorage.getItem(profileStorageKey) || '{}');
      if (!storedProfile || typeof storedProfile !== 'object' || Array.isArray(storedProfile)) {
        throw new Error('بيانات الملف الشخصي المحفوظة غير صالحة.');
      }
      window.localStorage.setItem(profileStorageKey, JSON.stringify({
        ...(storedProfile as Record<string, unknown>),
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
      }));
      setSaveError('');
      setSaveMessage('تم حفظ بيانات الملف الشخصي على هذا الجهاز.');
      if (savedMessageTimeout.current !== null) {
        window.clearTimeout(savedMessageTimeout.current);
      }
      savedMessageTimeout.current = window.setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('');
      setSaveError(error instanceof Error
        ? error.message
        : 'تعذر حفظ الإعدادات في هذا المتصفح. تحقق من مساحة التخزين المتاحة ثم أعد المحاولة.');
    }
  }

  function saveConnectedStores(stores: ConnectedStore[]) {
    try {
      window.localStorage.setItem(connectedStoresStorageKey, JSON.stringify(stores));
      setConnectedStores(stores);
      setStoreError('');
      setStoreMessage('تم حفظ قائمة المتاجر بنجاح.');
      return true;
    } catch {
      setStoreMessage('');
      setStoreError('تعذر حفظ قائمة المتاجر في هذا المتصفح. تحقق من مساحة التخزين المتاحة ثم أعد المحاولة.');
      return false;
    }
  }

  function handleAddStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = storeName.trim();
    const url = storeUrl.trim();
    if (!name || !url) {
      setStoreError('أدخل اسم المتجر ورابطه قبل الحفظ.');
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      setStoreError('أدخل رابطاً صالحاً يبدأ بـ https:// أو http://.');
      return;
    }
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      setStoreError('يجب أن يبدأ رابط المتجر بـ https:// أو http://.');
      return;
    }

    const nextStores = [
      ...connectedStores,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, name, url: parsedUrl.href },
    ];
    if (saveConnectedStores(nextStores)) {
      setStoreName('');
      setStoreUrl('');
    }
  }

  function handleDeleteStore(storeId: string) {
    saveConnectedStores(connectedStores.filter((store) => store.id !== storeId));
  }

  return (
    <AppShell>
      <div className="page-content" dir="rtl">
        <PageHeading
          eyebrow="مساحة العمل"
          title="الإعدادات"
          description="الملف الشخصي وحالة الخدمات المتصلة."
          action={(
            <div className="settings-avatar-area">
              <input
                ref={avatarInput}
                className="settings-avatar-input"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                aria-label="اختيار صورة الملف الشخصي"
              />
              <button
                className="settings-avatar-upload"
                type="button"
                onClick={() => avatarInput.current?.click()}
                aria-label={profileAvatar ? 'تغيير الصورة الشخصية' : 'رفع صورة شخصية'}
              >
                <span className="settings-avatar">
                  {profileAvatar
                    ? <img src={profileAvatar} alt="" />
                    : profile.name.trim()
                      ? <span aria-hidden="true">{profile.name.trim().charAt(0)}</span>
                      : <CircleUserRound size={29} aria-hidden="true" />}
                  <span className="settings-avatar-camera" aria-hidden="true"><Camera size={13} /></span>
                </span>
                <span className="settings-avatar-label">{profileAvatar ? 'تغيير الصورة' : 'رفع صورة'}</span>
              </button>
              {avatarError && <div className="settings-avatar-error" role="alert">{avatarError}</div>}
            </div>
          )}
        />
        <form className="panel setting-card free-settings-card settings-profile-card" onSubmit={handleSave}>
          <div className="setting-card-heading">
            <CircleUserRound size={19} color="#397db7" />
            <div>
              <div className="eyebrow">الملف الشخصي</div>
              <h2>بيانات الملف الشخصي</h2>
            </div>
          </div>
          <p>حدّث الاسم الكامل والبريد الإلكتروني ورقم الهاتف المرتبطين بملفك.</p>
          {saveMessage && <div className="banner info" role="status"><CheckCircle size={17} /><span>{saveMessage}</span></div>}
          {saveError && <div className="banner danger" role="alert">{saveError}</div>}
          {!isLoaded && <div className="skeleton" style={{ width: '75%' }} />}
          <div className="setting-input-grid profile-input-grid">
            <div className="form-field">
              <label htmlFor="store-profile-name">الاسم الكامل</label>
              <input id="store-profile-name" name="name" value={profile.name} onChange={handleProfileChange} autoComplete="name" maxLength={120} />
            </div>
            <div className="form-field">
              <label htmlFor="store-profile-email">البريد الإلكتروني / Gmail</label>
              <input id="store-profile-email" name="email" type="email" dir="ltr" value={profile.email} onChange={handleProfileChange} autoComplete="email" maxLength={254} placeholder="name@gmail.com" />
            </div>
            <div className="form-field">
              <label htmlFor="store-profile-phone">رقم الهاتف / WhatsApp</label>
              <input id="store-profile-phone" name="phone" type="tel" dir="ltr" value={profile.phone} onChange={handleProfileChange} autoComplete="tel" maxLength={40} placeholder="+212 600-000000" />
            </div>
          </div>
          <div className="settings-profile-actions">
            <button className="btn-primary" type="submit" data-testid="button-save-store-profile">
              <Save size={16} />
              حفظ الملف الشخصي
            </button>
            {onOpenProfile && (
              <button className="btn-secondary" type="button" onClick={onOpenProfile} data-testid="button-edit-profile">
                إدارة بيانات الحساب
              </button>
            )}
            {onSignOut && (
              <button className="btn-secondary" type="button" onClick={onSignOut} data-testid="button-settings-sign-out">
                <LogOut size={15} />
                تسجيل الخروج
              </button>
            )}
          </div>
        </form>
        <div className="settings-flow">
          <section className="settings-flow-section" aria-labelledby="settings-integrations-heading">
            <div className="settings-flow-heading">
              <div className="eyebrow">القسم الثاني</div>
              <h2 id="settings-integrations-heading">الخدمات ومنصات التسويق</h2>
              <p>أدر روابط منصاتك وإعدادات الخدمات من صفوف واضحة ونوافذ إعداد مخصصة.</p>
            </div>
            <IntegrationStatusPanel showMarketingPlatforms />
            <div className="banner info settings-security-note">
              <ShieldCheck size={17} />
              <div>
                <strong>المفاتيح والخصوصية</strong>
                مفاتيح Binance وروابط المنصات تُحفظ محلياً في هذا المتصفح. لا تضع مفاتيح سرية في المحادثة؛ يقرأ المساعد إعداد المزوّد من الخادم.
              </div>
            </div>
          </section>
          <section className="panel setting-card connected-stores-card" style={{ gridColumn: '1 / -1' }}>
            <div className="setting-card-heading">
              <ShoppingBag size={19} color="#397db7" />
              <div>
                <div className="eyebrow">القسم الثالث</div>
                <h2>المتاجر والمنصات المتصلة</h2>
              </div>
            </div>
            <p>أضف روابط متاجرك وأسواقك الإلكترونية للوصول إليها وإدارتها من مكان واحد.</p>
            {storeMessage && <div className="banner info" role="status"><CheckCircle size={17} /><span>{storeMessage}</span></div>}
            {storeError && <div className="banner danger" role="alert">{storeError}</div>}
            <form className="connected-store-form" onSubmit={handleAddStore}>
              <div className="form-field">
                <label htmlFor="connected-store-name">اسم المتجر</label>
                <input id="connected-store-name" value={storeName} onChange={(event) => { setStoreName(event.target.value); setStoreError(''); setStoreMessage(''); }} maxLength={120} placeholder="مثال: متجر Whop الرقمي" required />
              </div>
              <div className="form-field">
                <label htmlFor="connected-store-url">رابط المتجر</label>
                <input id="connected-store-url" type="url" dir="ltr" value={storeUrl} onChange={(event) => { setStoreUrl(event.target.value); setStoreError(''); setStoreMessage(''); }} placeholder="https://whop.com/mystore" required />
              </div>
              <button className="btn-primary connected-store-submit" type="submit" data-testid="button-add-connected-store"><Plus size={16} /> حفظ المتجر / إضافة المتجر</button>
            </form>
            {connectedStores.length > 0 ? (
              <div className="connected-store-list" aria-label="المتاجر المحفوظة">
                {connectedStores.map((store) => (
                  <article className="connected-store-item" key={store.id} data-testid={`connected-store-${store.id}`}>
                    <div className="connected-store-icon"><ShoppingBag size={17} /></div>
                    <div className="connected-store-details"><strong>{store.name}</strong><span dir="ltr">{store.url}</span></div>
                    <div className="connected-store-actions">
                      <a className="btn-secondary" href={store.url} target="_blank" rel="noopener noreferrer" aria-label={`فتح ${store.name} في نافذة جديدة`}><ExternalLink size={14} /> فتح المتجر</a>
                      <button className="btn-quiet connected-store-delete" type="button" onClick={() => handleDeleteStore(store.id)} aria-label={`حذف ${store.name}`} data-testid={`button-delete-connected-store-${store.id}`}><Trash2 size={14} /> حذف</button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="connected-store-empty"><ShoppingBag size={20} /><span>لم تتم إضافة متاجر بعد.</span></div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
