import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useCreateDigitalProduct, useDeleteDigitalProduct, useGetWhopStatus, useListDigitalProducts, useCreateStoreCheckout, useListStorePlans, getListDigitalProductsQueryKey, getListStorePlansQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpLeft, Box, ExternalLink, LoaderCircle, Plus, Trash2, X } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { EmptyState, ErrorState, PageHeading, formatDate, formatMoney, getErrorMessage } from '../components/Shared';
import { getLegacyDigitalProducts, removeLegacyDigitalProduct } from '../lib/digital-products';

export function ProductsPage() {
  const queryClient = useQueryClient();
  const products = useListDigitalProducts();
  const createDigitalProduct = useCreateDigitalProduct();
  const deleteDigitalProduct = useDeleteDigitalProduct();
  const whopStatus = useGetWhopStatus();
  const plans = useListStorePlans({ query: { queryKey: getListStorePlansQueryKey(), enabled: whopStatus.data?.whop === 'ready' } });
  const isWhopUnavailable = whopStatus.isError || (whopStatus.data && whopStatus.data.whop !== 'ready') || (plans.isError && typeof plans.error === 'object' && plans.error !== null && 'status' in plans.error && plans.error.status === 503);
  const checkout = useCreateStoreCheckout();
  const digitalProducts = products.data ?? [];
  const [isOpen, setIsOpen] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const migrationStarted = useRef(false);

  useEffect(() => {
    if (products.isLoading || products.isError || migrationStarted.current) return;
    const legacyProducts = getLegacyDigitalProducts();
    migrationStarted.current = true;
    if (legacyProducts.length === 0) return;

    void (async () => {
      for (const product of legacyProducts) {
        await createDigitalProduct.mutateAsync({
          data: {
            title: product.title,
            description: product.description,
            price: product.price,
            downloadUrl: product.downloadUrl,
          },
        });
        removeLegacyDigitalProduct(product.id);
      }
      await queryClient.invalidateQueries({ queryKey: getListDigitalProductsQueryKey() });
      setActionSuccess('تم نقل منتجاتك المحفوظة سابقاً إلى كتالوج المتجر.');
    })().catch((error: unknown) => {
      migrationStarted.current = false;
      setActionError(`تعذر نقل منتج محفوظ سابقاً. ${getErrorMessage(error)}`);
    });
  }, [createDigitalProduct.mutateAsync, products.isError, products.isLoading, queryClient]);

  const submitProduct = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError('');
    setActionSuccess('');
    createDigitalProduct.mutate(
      { data: { title: title.trim(), description: description.trim(), price: Number(price), downloadUrl: downloadUrl.trim() } },
      {
        onSuccess: async () => {
          setActionSuccess('تمت إضافة المنتج إلى كتالوجك الرقمي.');
          setIsOpen(false);
          setTitle('');
          setDescription('');
          setPrice('');
          setDownloadUrl('');
          await queryClient.invalidateQueries({ queryKey: getListDigitalProductsQueryKey() });
        },
        onError: (error) => setActionError(getErrorMessage(error)),
      },
    );
  };

  const removeDigitalProduct = (productId: string) => {
    deleteDigitalProduct.mutate(
      { id: productId },
      {
        onSuccess: async () => queryClient.invalidateQueries({ queryKey: getListDigitalProductsQueryKey() }),
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
          description="أدر منتجاتك الرقمية وروابط التنزيل، وتابع خطط الدفع المتصلة بـ Whop."
          action={<button className="btn-primary" type="button" onClick={() => { setActionError(''); setIsOpen(true); }} data-testid="button-create-product"><Plus size={15} /> منتج جديد</button>}
        />
        <div className="banner" style={{ marginBottom: 17 }}>
          <span>i</span>
          <div><strong>كتالوج المنتجات الرقمية</strong>تُحفظ المنتجات وروابط التنزيل في كتالوج المتجر، وتستطيع روبي استخدامها وإنشاء منتجات جديدة. خطط الدفع أدناه متصلة بـ Whop.</div>
        </div>
        {actionError && <div className="banner danger" role="alert" style={{ marginBottom: 14 }}><div><strong>لم يكتمل الإجراء</strong>{actionError}</div></div>}
        {actionSuccess && <div className="banner info" role="status" style={{ marginBottom: 14 }}><div>{actionSuccess}</div></div>}
        {products.isLoading && <div className="panel skeleton-card"><div className="skeleton" style={{ width: '45%' }} /><div className="skeleton" style={{ width: '72%', height: 24, marginTop: 20 }} /></div>}
        {products.isError && <ErrorState message={`تعذر تحميل الكتالوج الرقمي. ${getErrorMessage(products.error)}`} onRetry={() => products.refetch()} />}
        {digitalProducts.length > 0 && (
          <>
            <h2 className="section-title">المنتجات الرقمية <span>{digitalProducts.length}</span></h2>
            <div className="product-grid" style={{ marginBottom: 26 }}>
              {digitalProducts.map((product) => (
                <article className="panel product-card" key={product.id} data-testid={`card-digital-product-${product.id}`}>
                  <div className="product-top">
                    <div className="product-symbol"><Box size={19} /></div>
                    <button className="btn-quiet" type="button" onClick={() => removeDigitalProduct(product.id)} disabled={deleteDigitalProduct.isPending} aria-label={`حذف ${product.title}`} title="حذف المنتج" data-testid={`button-delete-digital-product-${product.id}`}><Trash2 size={15} /></button>
                  </div>
                  <h3>{product.title}</h3>
                  <p>{product.description}</p>
                  <div className="product-meta">
                    <div>
                      <div className="product-price">{formatMoney(product.price, 'usd')}</div>
                      <small style={{ color: '#92968f', fontSize: 10 }}>{formatDate(product.createdAt)}</small>
                    </div>
                    <a className="btn-secondary" href={product.downloadUrl} target="_blank" rel="noreferrer" data-testid={`link-download-${product.id}`}><ExternalLink size={14} /> رابط التنزيل</a>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
        <h2 className="section-title">خطط الدفع عبر Whop</h2>
        {plans.isLoading && (
          <div className="product-grid">
            {[0, 1, 2].map((item) => <div className="panel skeleton-card" key={item}><div className="skeleton" style={{ width: '60%' }} /><div className="skeleton" style={{ width: '80%', height: 22, marginTop: 22 }} /></div>)}
          </div>
        )}
        {isWhopUnavailable && <div className="banner info" role="status" style={{ marginBottom: 14 }}><div><strong>كتالوجك الرقمي جاهز</strong>خطط Whop غير مهيأة حالياً؛ يمكنك إدارة المنتجات الرقمية وروابطها من هذا الكتالوج.</div></div>}
        {plans.isError && !isWhopUnavailable && <ErrorState message={`تعذر تحميل خطط Whop. ${getErrorMessage(plans.error)}`} onRetry={() => plans.refetch()} />}
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
        {whopStatus.data?.whop === 'ready' && plans.data && plans.data.length === 0 && (
          <div className="panel">
            <EmptyState title="لا توجد خطط دفع من Whop" description="تظهر هنا خطط الدفع المرتبطة بحساب Whop. المنتجات الرقمية المحفوظة تظهر في قسمها أعلاه." icon={<Box size={22} />} />
          </div>
        )}
        {isOpen && (
          <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}>
            <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="create-product-title" dir="rtl">
              <div className="modal-head">
                <div><h2 id="create-product-title">إضافة منتج رقمي</h2><p>أضف بيانات المنتج ورابط الملف أو صفحة التنزيل.</p></div>
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
                  <label htmlFor="product-download-url">رابط التنزيل الرقمي</label>
                  <input id="product-download-url" type="url" inputMode="url" placeholder="https://example.com/download" value={downloadUrl} onChange={(event) => setDownloadUrl(event.target.value)} required data-testid="input-product-download-url" />
                </div>
                <button className="btn-primary" type="submit" disabled={createDigitalProduct.isPending} style={{ width: '100%' }} data-testid="button-submit-product">
                  {createDigitalProduct.isPending ? 'جارٍ الحفظ…' : 'إضافة المنتج'}
                </button>
              </form>
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}
