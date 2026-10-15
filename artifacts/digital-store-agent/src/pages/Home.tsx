import { useAuth } from '@clerk/react';
import { ArrowLeft, ChartNoAxesCombined, CircleDollarSign, PackageCheck, ShieldCheck, Store } from 'lucide-react';
import { Link, Redirect } from 'wouter';
import { FeminineRobotAvatar } from '../components/FeminineRobotAvatar';

export function HomePage() {
  const { isLoaded, isSignedIn } = useAuth();
  if (isLoaded && isSignedIn) return <Redirect to="/dashboard" />;

  return (
    <div className="landing" dir="rtl">
      <nav className="landing-nav">
        <div className="landing-logo">
            <div className="brand-mark"><FeminineRobotAvatar size={34} decorative /></div>
          <span>تاجر ذكي</span>
        </div>
        <div className="landing-links">
          <a href="#features">المزايا</a>
          <Link href="/sign-in" className="btn-quiet" data-testid="link-sign-in">تسجيل الدخول</Link>
          <Link href="/sign-up" className="btn-primary" data-testid="link-sign-up">ابدأ الآن <ArrowLeft size={14} /></Link>
        </div>
      </nav>
      <section className="landing-hero">
        <div className="landing-copy">
          <div className="eyebrow">رفيق عملي لصاحب المتجر الرقمي</div>
          <h1>أنت تدير المتجر.<br /><em>والتاجر الذكي</em><br />يرتب التفاصيل.</h1>
          <p>من المنتجات إلى المدفوعات، لوحة واحدة تمنحك رؤية واضحة لما يحدث في متجرك. بلا ضجيج، وبلا أرقام مصطنعة.</p>
          <div className="landing-cta">
            <Link href="/sign-up" className="btn-primary" data-testid="link-start-store">افتح مساحة متجرك <ArrowLeft size={15} /></Link>
            <Link href="/sign-in" className="btn-quiet" data-testid="link-existing-account">لديك حساب بالفعل</Link>
          </div>
        </div>
        <div className="landing-art" aria-label="رسم تاجر آلي">
          <div className="orbit" />
          <div className="orbit-tag first"><Store size={14} style={{ verticalAlign: 'middle', marginLeft: 7 }} /> متجرك في مكان واحد</div>
          <div className="orbit-tag second"><ShieldCheck size={14} style={{ verticalAlign: 'middle', marginLeft: 7 }} /> أرقام من مصدرها</div>
          <div className="assistant-hero-orb">
            <FeminineRobotAvatar size={245} decorative />
          </div>
        </div>
      </section>
      <section className="landing-trust">
        <div className="landing-trust-inner">
          <strong>معلومات متجرك من خدماتها الأصلية</strong>
          <span><PackageCheck size={15} style={{ verticalAlign: 'middle', marginLeft: 6 }} /> المنتجات والأسعار من Whop</span>
          <span><CircleDollarSign size={15} style={{ verticalAlign: 'middle', marginLeft: 6 }} /> المدفوعات كما سُجلت</span>
          <span><ChartNoAxesCombined size={15} style={{ verticalAlign: 'middle', marginLeft: 6 }} /> لا نعرض تقديرات كأنها حقائق</span>
        </div>
      </section>
      <section id="features" className="feature-section">
        <div className="eyebrow">مساحة عمل صُممت لصاحب متجر واحد</div>
        <h2>كل ما تحتاجه واضح أمامك.</h2>
        <div className="feature-grid">
          <article className="panel feature-card">
            <ChartNoAxesCombined size={20} color="#397db7" />
            <h3>صورة تشغيلية مباشرة</h3>
            <p>شاهد ملخص المنتجات والمبيعات والعملاء من البيانات المتاحة، مع تنبيه واضح حين تحتاج الخدمة إلى صلاحية إضافية.</p>
          </article>
          <article className="panel feature-card">
            <PackageCheck size={20} color="#397db7" />
            <h3>كتالوج المنتجات</h3>
            <p>أنشئ خطط منتجاتك وأدر روابط الدفع المستضافة في مكان واحد.</p>
          </article>
          <article className="panel feature-card">
            <FeminineRobotAvatar size={27} decorative />
            <h3>مساعد عربي صريح</h3>
            <p>واجهة المساعد جاهزة، وسيظل إنشاء المحتوى والصوت متوقفاً حتى يكتمل إعداد الذكاء الاصطناعي.</p>
          </article>
        </div>
      </section>
      <footer className="landing-footer">تاجر ذكي — لوحة تشغيل واضحة لمتجرك الرقمي</footer>
    </div>
  );
}
