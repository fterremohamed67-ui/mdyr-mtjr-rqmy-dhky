import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useClerk, useUser } from '@clerk/react';
import { getGetWhopStatusQueryKey, useGetWhopStatus } from '@workspace/api-client-react';
import {
  Activity,
  Bot,
  CircleDollarSign,
  LayoutDashboard,
  Package,
  Settings2,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { FeminineRobotAvatar } from './FeminineRobotAvatar';
import { integrationStatusLabel } from '../lib/integration-status';

const navigation = [
  { href: '/dashboard', label: 'نظرة عامة', icon: LayoutDashboard },
  { href: '/products', label: 'المنتجات', icon: Package },
  { href: '/sales', label: 'المبيعات', icon: ShoppingBag },
  { href: '/assistant', label: 'المساعد', icon: Bot },
  { href: '/finance', label: 'المالية', icon: CircleDollarSign },
  { href: '/settings', label: 'الإعدادات', icon: Settings2 },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const whopStatus = useGetWhopStatus({ query: { queryKey: getGetWhopStatusQueryKey() } });
  const storeStatus = integrationStatusLabel(whopStatus.data?.whop);
  const initials = user?.firstName?.slice(0, 1) || user?.primaryEmailAddress?.emailAddress?.slice(0, 1) || 'م';

  return (
    <div className="app-shell" dir="rtl">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-mark">
            <FeminineRobotAvatar size={34} decorative />
          </div>
          <div className="brand-title">
            تاجر ذكي
            <span className="brand-caption">مركز عمليات متجرك</span>
          </div>
        </div>
        <div className="side-label">القائمة الرئيسية</div>
        <nav className="nav-stack" aria-label="التنقل الرئيسي">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-link ${location === href ? 'nav-link-active' : ''}`}
              data-testid={`link-nav-${href.slice(1)}`}
            >
              <Icon size={17} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="robot-card">
            <Sparkles size={17} color="#8fc8f1" />
            <strong>متجرك، من مكان واحد</strong>
            <p>تابع المنتجات والمدفوعات وحالة الخدمات دون أن تفقد الصورة الكبيرة.</p>
          </div>
          <button
            className="nav-link"
            style={{ width: '100%', marginTop: 13, border: 0, background: 'transparent' }}
            type="button"
            data-testid="button-sign-out"
            onClick={() => signOut({ redirectUrl: import.meta.env.BASE_URL || '/' })}
          >
            <Activity size={17} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar" dir="rtl">
          <div className="breadcrumb">متجري <span style={{ padding: '0 7px' }}>/</span> مساحة العمل</div>
          <div className="topbar-actions">
            <div className="service-chip" title="الحالة من واجهة تكامل Whop">
              <i className="service-dot" />
              <span>{whopStatus.isLoading ? 'جارٍ التحقق' : whopStatus.isError ? 'الحالة غير مؤكدة' : storeStatus.label}</span>
            </div>
            <div className="avatar-initials" aria-label="حساب المستخدم">{initials}</div>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
