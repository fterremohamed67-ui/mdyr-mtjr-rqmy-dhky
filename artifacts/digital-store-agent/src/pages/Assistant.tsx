import { type FormEvent, useState } from 'react';
import { useSendAgentMessage } from '@workspace/api-client-react';
import { Bot, Mic, Send, ShieldAlert, Sparkles } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { PageHeading, getErrorMessage } from '../components/Shared';

const assistantIsAvailable = false;

export function AssistantPage() {
  const [message, setMessage] = useState('');
  const assistant = useSendAgentMessage();
  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (assistantIsAvailable && message.trim()) {
      assistant.mutate({ data: { message: message.trim() } }, { onSuccess: () => setMessage('') });
    }
  };

  return (
    <AppShell>
      <div className="page-content" dir="rtl">
        <PageHeading eyebrow="مساعد متجرك" title="المساعد الذكي" description="واجهة عربية للمحادثة ومساندة أعمال المتجر." />
        <div className="assistant-layout">
          <section className="panel chat-panel">
            <header className="chat-header">
              <div className="robot-face"><Bot size={23} /></div>
              <div><strong>رفيق المتجر</strong><span>المحادثة الصوتية والنصية غير متاحة مؤقتاً</span></div>
              <span className="status-pill warning" style={{ marginRight: 'auto' }}>متوقف مؤقتاً</span>
            </header>
            <div className="chat-messages">
              <div className="chat-message">أهلاً بك. مساحة المساعد جاهزة، لكن لن أرسل إجابات مولدة أو أقدم محتوى صوتياً قبل تفعيل خدمة الذكاء الاصطناعي.</div>
              <div className="banner danger">
                <ShieldAlert size={17} />
                <div><strong>الخدمة متوقفة بوضوح</strong>إعداد OpenAI ينتظر ترقية الحساب. لن يتم إرسال الرسائل أو عرض ردود وهمية.</div>
              </div>
              {assistant.isError && <div className="banner danger" role="alert">{getErrorMessage(assistant.error)}</div>}
            </div>
            <form className="chat-compose" onSubmit={sendMessage}>
              <input
                className="chat-input"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="ستتمكن من كتابة سؤالك بعد تفعيل الخدمة"
                disabled
                aria-label="رسالة للمساعد"
                data-testid="input-assistant-message"
              />
              <button className="btn-secondary" type="submit" disabled aria-label="إرسال الرسالة" data-testid="button-send-message"><Send size={15} /></button>
              <button className="btn-secondary" type="button" disabled aria-label="التحدث صوتياً" data-testid="button-voice-control"><Mic size={15} /></button>
            </form>
          </section>
          <aside>
            <section className="panel side-note">
              <div className="empty-icon" style={{ margin: '0 0 15px' }}><Sparkles size={20} /></div>
              <h3>لا نختلق الإجابات</h3>
              <p>خدمة الذكاء الاصطناعي تتطلب ترقية الحساب. تم تعطيل توليد المحتوى والصوت حتى تصبح الخدمة متاحة فعلياً.</p>
            </section>
            <section className="panel side-note" style={{ marginTop: 14 }}>
              <h3>ما الذي سيصبح متاحاً؟</h3>
              <p>إرسال سؤال نصي باللغة العربية، واستقبال إجابة من الخدمة الفعلية، مع عناصر تحكم صوتية عندما يتوفر التكامل.</p>
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
