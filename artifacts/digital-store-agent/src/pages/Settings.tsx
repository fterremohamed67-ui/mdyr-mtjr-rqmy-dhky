import { useUser } from '@clerk/react';
import { CircleUserRound, LogOut, Phone, ShieldCheck } from 'lucide-react';
import { useClerk } from '@clerk/react';
import { AppShell } from '../components/AppShell';
import { IntegrationStatusPanel } from '../components/IntegrationStatusPanel';
import { PageHeading } from '../components/Shared';

export function SettingsPage() {
  const { user, isLoaded } = useUser();
  const { openUserProfile, signOut } = useClerk();

  return (
    <AppShell>
      <div className="page-content" dir="rtl">
        <PageHeading eyebrow="مساحة العمل" title="الإعدادات" description="الملف الشخصي وحالة الخدمات المتصلة." />
        <div className="setting-layout">
          <section className="panel setting-card">
            <CircleUserRound size={19} color="#397db7" />
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
                  <Phone size={19} color="#4f91b9" />
                  <div>
                    <strong>رقم الهاتف</strong>
                    <span>{user?.primaryPhoneNumber?.phoneNumber || 'لم يُضف رقم هاتف إلى الحساب بعد'}</span>
                  </div>
                </div>
                <div className="profile-row">
                  <ShieldCheck size={19} color="#4f91b9" />
                  <div><strong>المصادقة والبيانات</strong><span>يُدار الاسم والبريد والهاتف عبر إعدادات الحساب الآمنة.</span></div>
                </div>
                <button className="btn-primary" type="button" style={{ marginTop: 17 }} onClick={() => openUserProfile()} data-testid="button-edit-profile">
                  إدارة بيانات الحساب
                </button>
                <button className="btn-secondary" type="button" style={{ marginTop: 17 }} onClick={() => signOut({ redirectUrl: import.meta.env.BASE_URL || '/' })} data-testid="button-settings-sign-out">
                  <LogOut size={15} />
                  تسجيل الخروج
                </button>
              </>
            )}
          </section>
          <IntegrationStatusPanel />
          <section className="panel setting-card free-settings-card" style={{ gridColumn: '1 / -1' }}>
            <h2>تفضيلات الاستخدام</h2>
            <p>إدارة خدمة بسيطة وشفافة، مع الحفاظ على اختيارك المجاني.</p>
            <div className="banner info">
              <ShieldCheck size={17} />
              <div>
                <strong>الخدمات المدفوعة غير مفعّلة</strong>
                لن نطلب منك مفاتيح سرية أو نفعّل مزوداً مدفوعاً. تبقى المحادثة والصوت وتوليد أوصاف المنتجات متوقفة؛ تُدار مفاتيح الخدمات عبر الاتصالات والأسرار الآمنة، لا في حقول الصفحة.
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
