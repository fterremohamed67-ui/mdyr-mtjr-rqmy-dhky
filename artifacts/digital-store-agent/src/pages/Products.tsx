import { type FormEvent, useState } from 'react';
import { useCreateStoreCheckout, useCreateStoreProduct, useListStorePlans, getListStorePlansQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpLeft, Box, LoaderCircle, Plus, X } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { EmptyState, ErrorState, PageHeading, formatDate, formatMoney, getErrorMessage } from '../components/Shared';

export function ProductsPage() {
  const queryClient = useQueryClient();
  const plans = useListStorePlans({ query: { queryKey: getListStorePlansQueryKey() } });
  const createProduct = useCreateStoreProduct();
  const checkout = useCreateStoreCheckout();
  const [isOpen, setIsOpen] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');

  const submitProduct = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError('');
    setActionSuccess('');
    createProduct.mutate(
      { data: { title: title.trim(), description: description.trim(), price: Number(price), currency: 'usd', language } },
      {
        onSuccess: async () => {
          setActionSuccess('تم إرسال طلب إنشاء المنتج إلى Whop.');
          setIsOpen(false);
          setTitle('');
          setDescription('');
          setPrice('');
          await queryClient.invalidateQueries({ queryKey: getListStorePlansQueryKey() });
        },
        onError: (error) => setActionError(getErrorMessage(error)),
      },
    );
  };

  const createCheckout = (planId: string) => {
    setActionError('');
    setActionSuccess('');
    checkout.mutate(
      { data: { planId } },
      {
        onSuccess: (result) => {
          setActionSuccess('تم إنشاء رابط الدفع. سيتم فتح صفحة الدفع المستضافة.');
          window.open(result.purchaseUrl, '_blank', 'noopener,noreferrer');
        },
        onError: (error) => setActionError(getErrorMessage(error)),
      },
    );
  };

  return (
    <AppShell>
      <div className="page-content" dir="rtl">
        <PageHeading
          eyebrow="كتالوج المتجر"
          title="المنتجات"
          description="خطط المنتجات والأسعار المتصلة بحساب Whop."
          action={<button className="btn-primary" type="button" onClick={() => { setActionError(''); setIsOpen(true); }} data-testid="button-create-product"><Plus size={15} /> منتج جديد</button>}
        />
        <div className="banner" style={{ marginBottom: 17 }}>
          <span>i</span>
          <div><strong>حالة اتصال Whop</strong>الحساب متصل، لكن صلاحية company:basic:read غير متاحة حالياً. قد تفشل قراءة الخطط أو عمليات الإنشاء؛ سنعرض خطأ الخدمة كما هو.</div>
        </div>
        {actionError && <div className="banner danger" role="alert" style={{ marginBottom: 14 }}><div><strong>لم يكتمل الإجراء</strong>{actionError}</div></div>}
        {actionSuccess && <div className="banner info" role="status" style={{ marginBottom: 14 }}><div>{actionSuccess}</div></div>}
        {plans.isLoading && (
          <div className="product-grid">
            {[0, 1, 2].map((item) => <div className="panel skeleton-card" key={item}><div className="skeleton" style={{ width: '60%' }} /><div className="skeleton" style={{ width: '80%', height: 22, marginTop: 22 }} /></div>)}
          </div>
        )}
        {plans.isError && <ErrorState message={`تعذر تحميل خطط المنتجات. ${getErrorMessage(plans.error)}`} onRetry={() => plans.refetch()} />}
        {plans.data && plans.data.length > 0 && (
          <div className="product-grid">
            {plans.data.map((plan) => (
              <article className="panel product-card" key={plan.id} data-testid={`card-product-${plan.id}`}>
                <div className="product-top">
                  <div className="product-symbol"><Box size={19} /></div>
                  <span className="status-pill neutral">{plan.language === 'ar' ? 'عربي' : 'إنجليزي'}</span>
                </div>
                <h3>{plan.title}</h3>
                <p>{plan.description || 'لا يوجد وصف لهذا المنتج.'}</p>
                <div className="product-meta">
                  <div>
                    <div className="product-price">{formatMoney(plan.price, plan.currency)}</div>
                    <small style={{ color: '#92968f', fontSize: 10 }}>{formatDate(plan.createdAt)}</small>
                  </div>
                  <button className="btn-secondary" type="button" onClick={() => createCheckout(plan.id)} disabled={checkout.isPending} data-testid={`button-checkout-${plan.id}`}>
                    {checkout.isPending ? <LoaderCircle size={14} /> : <ArrowUpLeft size={14} />}
                    رابط دفع
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
        {plans.data && plans.data.length === 0 && (
          <div className="panel">
            <EmptyState title="كتالوجك فارغ حالياً" description="أنشئ أول خطة منتج. يتطلب الإنشاء اتصال Whop وصلاحيات حساب مناسبة." icon={<Box size={22} />} />
          </div>
        )}
        {isOpen && (
          <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}>
            <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="create-product-title" dir="rtl">
              <div className="modal-head">
                <div><h2 id="create-product-title">إنشاء منتج</h2><p>سيُرسل المنتج وخطة الدفع إلى Whop.</p></div>
                <button className="btn-quiet" type="button" onClick={() => setIsOpen(false)} aria-label="إغلاق" data-testid="button-close-product-modal"><X size={18} /></button>
              </div>
              <form onSubmit={submitProduct}>
                <div className="form-field">
                  <label htmlFor="product-title">اسم المنتج</label>
                  <input id="product-title" value={title} onChange={(event) => setTitle(event.target.value)} minLength={1} maxLength={120} required data-testid="input-product-title" />
                </div>
                <div className="form-field">
                  <label htmlFor="product-description">الوصف</label>
                  <textarea id="product-description" value={description} onChange={(event) => setDescription(event.target.value)} minLength={1} maxLength={2000} required data-testid="input-product-description" />
                </div>
                <div className="form-field">
                  <label htmlFor="product-price">السعر بالدولار الأمريكي</label>
                  <input id="product-price" type="number" inputMode="decimal" min="0.01" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} required data-testid="input-product-price" />
                </div>
                <div className="form-field">
                  <label htmlFor="product-language">لغة المنتج</label>
                  <select id="product-language" value={language} onChange={(event) => setLanguage(event.target.value as 'ar' | 'en')} data-testid="select-product-language">
                    <option value="ar">العربية</option>
                    <option value="en">الإنجليزية</option>
                  </select>
                </div>
                {createProduct.isError && <div className="banner danger" role="alert" style={{ marginBottom: 14 }}>{getErrorMessage(createProduct.error)}</div>}
                <button className="btn-primary" type="submit" disabled={createProduct.isPending} style={{ width: '100%' }} data-testid="button-submit-product">
                  {createProduct.isPending ? 'جارٍ الإرسال…' : 'إنشاء المنتج'}
                </button>
              </form>
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}
