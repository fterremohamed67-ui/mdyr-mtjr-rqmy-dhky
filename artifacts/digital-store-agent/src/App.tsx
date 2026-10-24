import { useEffect, useRef, type ReactNode } from 'react';
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Route, Router as WouterRouter, Switch, useLocation, Redirect } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppShell } from './components/AppShell';
import { AssistantPage } from './pages/Assistant';
import { DashboardPage } from './pages/Dashboard';
import { FinancePage } from './pages/Finance';
import { HomePage } from './pages/Home';
import { ProductsPage } from './pages/Products';
import { SalesPage } from './pages/Sales';
import { SettingsPage } from './pages/Settings';
import { isLocalPreview } from './lib/local-preview';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const clerkPubKey = isLocalPreview
  ? undefined
  : publishableKeyFromHost(
      window.location.hostname,
      import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
    );

const clerkProxyUrl =
  import.meta.env.VITE_CLERK_PROXY_URL ||
  (import.meta.env.PROD
    ? new URL('/api/__clerk', window.location.origin).toString()
    : undefined);
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function stripBase(path: string) {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

if (!clerkPubKey && !isLocalPreview) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#347bb8',
    colorForeground: '#203b58',
    colorMutedForeground: '#6b8093',
    colorDanger: '#a84f3e',
    colorBackground: 'rgba(247,251,255,.92)',
    colorInput: 'rgba(250,253,255,.88)',
    colorInputForeground: '#294865',
    colorNeutral: '#b8d0e4',
    fontFamily: "'IBM Plex Sans Arabic', sans-serif",
    borderRadius: '0.8rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#f7fbff]/85 border border-white/80 shadow-xl backdrop-blur-xl rounded-2xl w-[440px] max-w-full overflow-hidden',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#203b58] font-bold',
    headerSubtitle: 'text-[#6b8093]',
    socialButtonsBlockButtonText: 'text-[#355570]',
    formFieldLabel: 'text-[#59625e]',
    footerActionLink: 'text-[#347bb8] font-semibold',
    footerActionText: 'text-[#6b8093]',
    dividerText: 'text-[#6b8093]',
    identityPreviewEditButton: 'text-[#347bb8]',
    formFieldSuccessText: 'text-[#47745d]',
    alertText: 'text-[#8f4e3b]',
    logoBox: 'rounded-xl overflow-hidden',
    logoImage: 'rounded-xl',
    socialButtonsBlockButton: 'border-[#b8d0e4] bg-[#fafdff]',
    formButtonPrimary: 'bg-[#347bb8] hover:bg-[#286899] text-white',
    formFieldInput: 'border-[#b8d0e4] bg-[#fafdff] text-[#294865]',
    footerAction: 'border-t border-[#eeeae1]',
    dividerLine: 'bg-[#e7e1d6]',
    alert: 'bg-[#fae1e5] border-[#ce8d97]',
    otpCodeFieldInput: 'border-[#b8d0e4] bg-[#fafdff] text-[#294865]',
    formFieldRow: 'text-[#355570]',
    main: 'text-[#203b58]',
  },
};

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (previousUserId.current !== undefined && previousUserId.current !== userId) {
        client.clear();
      }
      previousUserId.current = userId;
    });
    return unsubscribe;
  }, [addListener, client]);

  return null;
}

function SignInPage() {
  return (
    <div className="landing" dir="rtl" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div style={{ position: 'fixed', top: 20, right: 24, display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, color: '#203b58' }}>
        <img src={`${basePath}/logo.svg`} alt="" width="35" height="35" />
        تاجر ذكي
      </div>
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="landing" dir="rtl" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div style={{ position: 'fixed', top: 20, right: 24, display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, color: '#203b58' }}>
        <img src={`${basePath}/logo.svg`} alt="" width="35" height="35" />
        تاجر ذكي
      </div>
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}

function ProtectedPage({ children }: { children: ReactNode }) {
  if (isLocalPreview) return <>{children}</>;
  return <ClerkProtectedPage>{children}</ClerkProtectedPage>;
}

function ClerkProtectedPage({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) {
    return (
      <AppShell>
        <div className="page-content">
          <div className="panel skeleton-card">
            <div className="skeleton" style={{ width: '45%' }} />
            <div className="skeleton" style={{ width: '72%', height: 28, marginTop: 25 }} />
          </div>
        </div>
      </AppShell>
    );
  }
  if (!isSignedIn) return <Redirect to="/" />;
  return <>{children}</>;
}

function AppRoutes() {
  const [location] = useLocation();

  return (
    <ErrorBoundary resetKey={location}>
      <Switch>
        <Route path="/" component={isLocalPreview ? LocalPreviewRedirect : HomePage} />
        <Route path="/sign-in/*?">
          {isLocalPreview ? <Redirect to="/assistant" /> : <SignInPage />}
        </Route>
        <Route path="/sign-up/*?">
          {isLocalPreview ? <Redirect to="/assistant" /> : <SignUpPage />}
        </Route>
        <Route path="/dashboard">
          <ProtectedPage><DashboardPage /></ProtectedPage>
        </Route>
        <Route path="/products">
          <ProtectedPage><ProductsPage /></ProtectedPage>
        </Route>
        <Route path="/sales">
          <ProtectedPage><SalesPage /></ProtectedPage>
        </Route>
        <Route path="/assistant">
          <ProtectedPage><AssistantPage /></ProtectedPage>
        </Route>
        <Route path="/finance">
          <ProtectedPage><FinancePage /></ProtectedPage>
        </Route>
        <Route path="/settings">
          <ProtectedPage><SettingsPage /></ProtectedPage>
        </Route>
        <Route>
          <div className="landing" dir="rtl" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <h1>هذه الصفحة غير موجودة</h1>
              <a className="btn-primary" href={basePath || '/'}>العودة إلى البداية</a>
            </div>
          </div>
        </Route>
      </Switch>
    </ErrorBoundary>
  );
}

function LocalPreviewRedirect() {
  return <Redirect to="/assistant" />;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey!}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: 'مرحباً بعودتك',
            subtitle: 'سجّل الدخول لمتابعة متجرك.',
            actionText: 'ليس لديك حساب؟',
            actionLink: 'إنشاء حساب',
          },
        },
        signUp: {
          start: {
            title: 'أنشئ مساحة متجرك',
            subtitle: 'حساب واحد لإدارة متجرك الرقمي.',
            actionText: 'لديك حساب بالفعل؟',
            actionLink: 'تسجيل الدخول',
          },
        },
        formFieldLabel__emailAddress: 'البريد الإلكتروني',
        formFieldLabel__password: 'كلمة المرور',
        formFieldLabel__firstName: 'الاسم الأول',
        formFieldLabel__lastName: 'اسم العائلة',
        formFieldInputPlaceholder__emailAddress: 'أدخل بريدك الإلكتروني',
        formFieldInputPlaceholder__password: 'أدخل كلمة المرور',
        formFieldInputPlaceholder__firstName: 'أدخل اسمك',
        formFieldInputPlaceholder__lastName: 'أدخل اسم عائلتك',
        formButtonPrimary: 'متابعة',
        dividerText: 'أو',
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <ClerkQueryClientCacheInvalidator />
      <AppRoutes />
    </ClerkProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={basePath}>
          {isLocalPreview ? <AppRoutes /> : <ClerkProviderWithRoutes />}
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
