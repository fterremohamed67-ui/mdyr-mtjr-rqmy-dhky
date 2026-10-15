import { useGetWhopStatus, getGetWhopStatusQueryKey } from '@workspace/api-client-react';
import { Mic, Send, ShieldAlert, Sparkles } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { FeminineRobotAvatar } from '../components/FeminineRobotAvatar';
import { PageHeading } from '../components/Shared';
import { integrationStatusLabel } from '../lib/integration-status';

export function AssistantPage() {
  const services = useGetWhopStatus({ query: { queryKey: getGetWhopStatusQueryKey() } });
  const aiStatus = integrationStatusLabel(services.data?.ai);

  return (
    <AppShell>
      <div className="page-content" dir="rtl">
        <PageHeading eyebrow="مساعد متجرك" title="رُبى، رفيقة متجرك" description="مساعدة رقمية عربية بصوت هادئ وواضح — حالياً في وضع الاستعداد." />
        <div className="assistant-layout">
          <section className="panel chat-panel">
            <header className="chat-header">
              <div className="robot-face"><FeminineRobotAvatar size={46} /></div>
              <div>
                <strong>رُبى</strong>
                <span>مساعدة متجرك الرقمية — الاستخدام متوقف باختيارك المجاني</span>
              </div>
              <span className="status-pill neutral" style={{ marginRight: 'auto' }}>
                المحادثة غير نشطة
              </span>
            </header>
            <div className="chat-messages">
              <div className="assistant-paused-state">
                <FeminineRobotAvatar size={38} />
                <h3>أنا رُبى، رفيقة متجرك</h3>
                <p>يسعدني أن أرافقك في ترتيب التفاصيل. أنا في وضع الاستعداد الآن؛ لن تظهر هنا إجابات مولّدة أو محادثات وهمية.</p>
                <p className="assistant-api-status">
                  حالة تكامل الذكاء الاصطناعي:
                  {' '}
                  {services.isLoading ? 'جارٍ التحقق' : services.isError ? 'تعذر تأكيد الحالة' : aiStatus.label}
                </p>
              </div>
              <div className="banner danger">
                <ShieldAlert size={17} />
                <div>
                  <strong>المحادثة والتوليد غير نشطين</strong>
                  اخترت إبقاء المتجر على الخدمات المجانية؛ لذلك لا نستخدم مزوداً مدفوعاً ولا نطلب منك مفتاح OpenAI.
                </div>
              </div>
              {services.isError && (
                <div className="banner danger" role="alert">
                  تعذر قراءة حالة إعداد الذكاء الاصطناعي. ستظل ميزات المحادثة والصوت متوقفة.
                </div>
              )}
            </div>
            <div className="chat-compose">
              <input
                className="chat-input"
                placeholder="المحادثة غير مفعّلة حالياً"
                disabled
                aria-label="رسالة للمساعد"
                aria-describedby="assistant-disabled-note"
                data-testid="input-assistant-message"
              />
              <button className="btn-secondary" type="button" disabled aria-label="إرسال الرسالة غير متاح" title="المحادثة غير مفعّلة ضمن إعدادك المجاني" data-testid="button-send-message"><Send size={15} /></button>
              <button className="btn-secondary" type="button" disabled aria-label="التحكم الصوتي غير متاح" title="الصوت يتطلب خدمة ذكاء اصطناعي غير مفعّلة" data-testid="button-voice-control"><Mic size={15} /></button>
            </div>
            <p id="assistant-disabled-note" className="assistant-disabled-note">لن تُرسل الرسالة. المحادثة الصوتية والنصية متوقفة حالياً.</p>
          </section>
          <aside>
            <section className="panel side-note">
              <div className="assistant-side-portrait"><FeminineRobotAvatar size={104} /></div>
              <h3>رُبى تتحدث بصدق</h3>
              <p>لا أكتب وصفاً للمنتج ولا أجيب عن الأسئلة بصياغة مولدة ما دامت الخدمة غير مفعّلة. أبقي اللوحة واضحة لك حتى بدونها.</p>
            </section>
            <section className="panel side-note" style={{ marginTop: 14 }}>
              <div className="assistant-note-title"><Sparkles size={17} /><h3>اختيارك محفوظ</h3></div>
              <p>لن نطلب بيانات سرية أو نقترح ترقية مدفوعة. أدوات الصوت تبقى معطّلة ولا يوجد رد صوتي تجريبي.</p>
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
