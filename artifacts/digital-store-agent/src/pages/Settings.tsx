import { useUser } from '@clerk/react';
import { CircleUserRound, LogOut, ShieldCheck } from 'lucide-react';
import { useClerk } from '@clerk/react';
import { AppShell } from '../components/AppShell';
import { IntegrationStatusPanel } from '../components/IntegrationStatusPanel';
import { PageHeading } from '../components/Shared';

export function SettingsPage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  return (
    <AppShell>
      <div className="page-content" dir="rtl">
        <PageHeading eyebrow="مساحة العمل" title="الإعدادات" description="الملف الشخصي وحالة الخدمات المتصلة." />
        <div className="setting-layout">
          <section className="panel setting-card">
            <CircleUserRound size={19} color="#a85837" />
            <h2 style={{ marginTop: 13 }}>الملف الشخصي</h2>
            <p>بيانات الحساب المسجل عبر نظام المصادقة.</p>
            {!isLoaded && <div className="skeleton" style={{ width: '75%' }} />}
            {isLoaded && (
              <>
                <div className="profile-row" data-testid="profile-current-user">
                  <div className="profile-avatar">{user?.firstName?.slice(0, 1) || 'م'}</div>
                  <div>
                    <strong>{user?.fullName || 'صاحب المتجر'}</strong>
                    <span>{user?.primaryEmailAddress?.emailAddress || 'لا يوجد بريد إلكتروني'}</span>
                  </div>
                </div>
                <div className="profile-row">
                  <ShieldCheck size={19} color="#77917f" />
                  <div><strong>المصادقة والحساب</strong><span>تُدار إعدادات الدخول بأمان عبر Clerk.</span></div>
                </div>
                <button className="btn-secondary" type="button" style={{ marginTop: 17 }} onClick={() => signOut({ redirectUrl: import.meta.env.BASE_URL || '/' })} data-testid="button-settings-sign-out">
                  <LogOut size={15} />
                  تسجيل الخروج
                </button>
              </>
            )}
          </section>
          <IntegrationStatusPanel />
          <section className="panel setting-card" style={{ gridColumn: '1 / -1' }}>
            <h2>حالة المتجر</h2>
            <p>التكاملات تعرض حالتها الحالية بصدق. لا توجد إعدادات محلية تتجاوز حالة الخدمة الأصلية.</p>
            <div className="banner">
              <span>i</span>
              <div><strong>Whop متصل مع نقص صلاحية</strong>تحتاج خدمة Whop إلى صلاحية company:basic:read. أما واتساب فغير متصل، وBinance غير متاح، وOpenAI ينتظر ترقية الحساب.</div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
