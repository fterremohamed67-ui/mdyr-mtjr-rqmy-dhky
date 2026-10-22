import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useListDigitalProducts, useSendAgentMessage, getListDigitalProductsQueryKey, getListAgentAssetsQueryKey, type AgentAsset } from '@workspace/api-client-react';
import { Activity, Cpu, Download, LockKeyhole, MessageCircle, Mic, Send, Sparkles, Square, Volume2, Waves } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { AgentToolsPanel } from '../components/AgentToolsPanel';
import { FeminineRobotAvatar } from '../components/FeminineRobotAvatar';
import { PageHeading } from '../components/Shared';
import { isLocalPreview } from '../lib/local-preview';
import { createWhatsAppLink, getCustomerWhatsAppMessage } from '../lib/whatsapp';

type AssistantLanguage = 'ar' | 'en' | 'fr';
type ChatMessage = { id: number; role: 'assistant' | 'user'; text: string; language?: AssistantLanguage; whatsappMessage?: string; asset?: Pick<AgentAsset, 'name' | 'downloadUrl'> };
type SpeechRecognitionResultLike = ArrayLike<{ transcript: string }> & { isFinal: boolean };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: { results: ArrayLike<SpeechRecognitionResultLike> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const femaleVoiceName = /(?:female|woman|zira|hoda|salma|layla|leila|laila|fatima|amina|amany|arwa|maha|amira|maryam|noura|noor|hana|reem|layan|aisha|zeinab|zahra|mona|هدى|سلمى|ليلى|فاطمة|أمينة|أروى|مها|أميرة|مريم|نور|هنا|ريم|ليان|عائشة|زينب|سناء|زهرة|منى)/iu;

function detectSpeechLanguage(text: string): AssistantLanguage {
  if (/[\u0600-\u06ff]/u.test(text)) return 'ar';
  if (/[àâçéèêëîïôùûüÿœæ]/iu.test(text) || /\b(?:bonjour|bonsoir|merci|salut|avec|pour|votre|vous|je|nous|comment|produit|boutique|prix|créer|besoin)\b/iu.test(text)) {
    return 'fr';
  }
  return 'en';
}

function getSpeechLocale(language: AssistantLanguage): string {
  if (language === 'ar') return 'ar-SA';
  if (language === 'fr') return 'fr-FR';
  return 'en-US';
}

function getBrowserSpeechLanguage(): AssistantLanguage {
  if (typeof navigator === 'undefined') return 'ar';
  const browserLanguage = navigator.language.toLowerCase();
  if (browserLanguage.startsWith('fr')) return 'fr';
  if (browserLanguage.startsWith('en')) return 'en';
  return 'ar';
}

function chooseSpeechVoice(voices: SpeechSynthesisVoice[], language: AssistantLanguage) {
  const matchingVoices = voices.filter((voice) => voice.lang.replace(/_/gu, '-').toLowerCase().startsWith(`${language}-`));
  return matchingVoices
    .map((voice, index) => {
      const normalizedLanguage = voice.lang.replace(/_/gu, '-').toLowerCase();
      const name = voice.name.toLowerCase();
      const providerScore = /google|microsoft/iu.test(name) ? 100 : 0;
      const preferredLocaleScore = normalizedLanguage === getSpeechLocale(language).toLowerCase() ? 40 : 0;
      const femaleScore = femaleVoiceName.test(voice.name) ? 10 : 0;
      return { voice, index, score: providerScore + preferredLocaleScore + femaleScore };
    })
    .sort((left, right) => right.score - left.score || left.index - right.index)[0]?.voice;
}

const initialMessage: ChatMessage = {
  id: 1,
  role: 'assistant',
  language: 'ar',
  text: 'مرحباً بك. أنا روبي، وكيلة ذكية لإدارة متجرك الرقمي وتطوير منتجاته وتصاميمه. كيف أستطيع مساعدتك اليوم؟',
};

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  const speechWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

function cleanTextForSpeech(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/روبي/gu, (name) => detectSpeechLanguage(text) === 'ar' ? 'رُوبِي' : name)
    .replace(/\[([^\]]+)\]\((?:https?:\/\/|www\.)[^)]+\)/giu, '$1')
    .replace(/<(?:https?:\/\/|www\.)[^>]+>/giu, ' ')
    .replace(/\b(?:https?:\/\/|www\.)[^\s<>()]+/giu, ' ')
    .replace(/\b(?:[a-z0-9-]+\.)+(?:com|net|org|io|co|ai|app|dev|edu|gov|sa|uk|me|info|store|site|tech)(?:\/[^\s]*)?/giu, ' ')
    .replace(/[`*_#>~]/gu, ' ')
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, ' ')
    .replace(/[٠-٩۰-۹]/gu, (digit) => String.fromCharCode(
      digit >= '۰' ? digit.charCodeAt(0) - '۰'.charCodeAt(0) + '0'.charCodeAt(0) : digit.charCodeAt(0) - '٠'.charCodeAt(0) + '0'.charCodeAt(0),
    ))
    .replace(/\s+/gu, ' ')
    .trim();
}

function splitSpeechIntoChunks(text: string): string[] {
  if (text.length <= 180) return [text];

  const clauses = text.match(/[^,،;؛.!?؟]+[,،;؛.!?؟]*/gu);
  return clauses?.map((clause) => clause.trim()).filter(Boolean) ?? [text];
}

export function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [draft, setDraft] = useState('');
  const [isMicListening, setIsMicListening] = useState(false);
  const [micStatus, setMicStatus] = useState('');
  const [speechStatus, setSpeechStatus] = useState('');
  const [isWaitingForReply, setIsWaitingForReply] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<number | null>(null);
  const [registrationRequest, setRegistrationRequest] = useState(0);
  const sendAgentMessage = useSendAgentMessage();
  const queryClient = useQueryClient();
  const products = useListDigitalProducts();
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const speechRunRef = useRef(0);
  const speechAudioRef = useRef<HTMLAudioElement | null>(null);
  const speechAudioUrlRef = useRef<string | null>(null);
  const speechKeepAliveRef = useRef<number | null>(null);
  const speechVoicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const conversationLanguageRef = useRef<AssistantLanguage>(getBrowserSpeechLanguage());
  const messageIdRef = useRef(2);
  const messageListRef = useRef<HTMLDivElement>(null);
  const speechRecognitionConstructor = getSpeechRecognitionConstructor();

  function clearLocalSpeechKeepAlive() {
    if (speechKeepAliveRef.current !== null) {
      window.clearInterval(speechKeepAliveRef.current);
      speechKeepAliveRef.current = null;
    }
  }

  function stopSpeechOutput(updateState = true) {
    speechRunRef.current += 1;
    window.speechSynthesis?.cancel();
    clearLocalSpeechKeepAlive();
    speechAudioRef.current?.pause();
    if (speechAudioRef.current) {
      speechAudioRef.current.onerror = null;
      speechAudioRef.current.onplaying = null;
      speechAudioRef.current.onended = null;
      speechAudioRef.current.src = '';
      speechAudioRef.current = null;
    }
    if (speechAudioUrlRef.current) {
      URL.revokeObjectURL(speechAudioUrlRef.current);
      speechAudioUrlRef.current = null;
    }
    if (updateState) setSpeakingMessageId(null);
  }

  function stopMicrophoneListening() {
    const activeRecognition = recognitionRef.current;
    recognitionRef.current = null;
    setIsMicListening(false);

    if (activeRecognition) {
      try {
        activeRecognition.stop();
      } catch {
        setMicStatus('تعذر إيقاف الميكروفون بالكامل. أعد المحاولة أو تحقق من إذن المتصفح.');
        return;
      }
    }

    setMicStatus('توقف الاستماع.');
  }

  useEffect(() => {
    const messageList = messageListRef.current;
    messageList?.scrollTo({ top: messageList.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const synthesis = window.speechSynthesis;
    const previousHandler = synthesis.onvoiceschanged;
    const updateArabicVoice = (event: Event) => {
      previousHandler?.call(synthesis, event);
      speechVoicesRef.current = synthesis.getVoices();
    };

    speechVoicesRef.current = synthesis.getVoices();
    synthesis.onvoiceschanged = updateArabicVoice;

    return () => {
      if (synthesis.onvoiceschanged === updateArabicVoice) {
        synthesis.onvoiceschanged = previousHandler;
      }
    };
  }, []);

  useEffect(() => () => {
    recognitionRef.current?.stop();
    speechRunRef.current += 1;
    stopSpeechOutput(false);
  }, []);

  async function speak(text: string, messageId?: number, messageLanguage?: AssistantLanguage) {
    const speechText = cleanTextForSpeech(text);
    if (!speechText) {
      setSpeechStatus('لا يوجد نص مناسب للنطق بعد حذف الروابط.');
      return;
    }
    setSpeechStatus('');
    stopSpeechOutput();
    const runId = speechRunRef.current;

    const playLocally = () => {
      if (runId !== speechRunRef.current) return;
      if (!('speechSynthesis' in window)) {
        setSpeechStatus('النطق الصوتي غير متاح في هذا المتصفح.');
        setSpeakingMessageId(null);
        return;
      }

      const synthesis = window.speechSynthesis;
      const language = messageLanguage ?? detectSpeechLanguage(speechText);
      const voice = chooseSpeechVoice(speechVoicesRef.current.length ? speechVoicesRef.current : synthesis.getVoices(), language);
      clearLocalSpeechKeepAlive();
      const chunks = splitSpeechIntoChunks(speechText);
      chunks.forEach((chunk, index) => {
        const utterance = new SpeechSynthesisUtterance(chunk);
        utterance.voice = voice ?? null;
        utterance.lang = voice?.lang ?? getSpeechLocale(language);
        utterance.rate = 1.02;
        utterance.pitch = 1.0;
        utterance.onstart = () => {
          if (runId !== speechRunRef.current) return;
          setSpeakingMessageId(messageId ?? null);
        };
        utterance.onend = () => {
          if (index !== chunks.length - 1) return;
          clearLocalSpeechKeepAlive();
          if (runId !== speechRunRef.current) return;
          setSpeakingMessageId(null);
        };
        utterance.onerror = (event) => {
          if (event.error !== 'canceled' && event.error !== 'interrupted') {
            setSpeechStatus('تعذر تشغيل الصوت المحلي.');
            synthesis.cancel();
          }
          clearLocalSpeechKeepAlive();
          if (runId !== speechRunRef.current) return;
          setSpeakingMessageId(null);
        };
        synthesis.speak(utterance);
      });
      speechKeepAliveRef.current = window.setInterval(() => {
        if (runId !== speechRunRef.current || !synthesis.speaking) {
          clearLocalSpeechKeepAlive();
        } else if (synthesis.paused) {
          synthesis.resume();
        }
      }, 8000);
    };

    if (!isLocalPreview && speechText.length <= 180) {
      try {
        const response = await fetch('/api/agent/speech', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: speechText }),
        });
        if (response.ok && runId === speechRunRef.current) {
          const audioUrl = URL.createObjectURL(await response.blob());
          const audio = new Audio(audioUrl);
          speechAudioUrlRef.current = audioUrl;
          speechAudioRef.current = audio;
          let handled = false;
          const releaseAudio = () => {
            if (handled) return;
            handled = true;
            if (speechAudioRef.current === audio) speechAudioRef.current = null;
            if (speechAudioUrlRef.current === audioUrl) speechAudioUrlRef.current = null;
            URL.revokeObjectURL(audioUrl);
          };
          const finishCloudSpeech = () => {
            releaseAudio();
            if (runId !== speechRunRef.current) return;
            setSpeakingMessageId(null);
          };
          const fallbackToLocal = () => {
            if (handled) return;
            releaseAudio();
            if (runId === speechRunRef.current) playLocally();
          };
          audio.onplaying = () => {
            if (runId !== speechRunRef.current) return;
            setSpeakingMessageId(messageId ?? null);
          };
          audio.onended = finishCloudSpeech;
          audio.onerror = fallbackToLocal;
          try {
            await audio.play();
            return;
          } catch {
            fallbackToLocal();
            return;
          }
        }
      } catch {
        // Cloud speech is optional; continue with the browser voice.
      }
    }

    playLocally();
  }

  function toggleSpeech(message: ChatMessage) {
    if (speakingMessageId === message.id) {
      stopSpeechOutput();
      return;
    }
    void speak(message.text, message.id, message.language);
  }

  function sendMessage(value: string, fromVoice = false) {
    const text = value.trim();
    if (!text || isWaitingForReply) return;
    conversationLanguageRef.current = detectSpeechLanguage(text);

    const id = messageIdRef.current++;
    setMessages((current) => [
      ...current,
      { id, role: 'user', text },
    ]);
    setDraft('');
    setMicStatus(fromVoice ? 'تم تحويل كلامك إلى نص.' : '');

    if (/(?:افتح|انشئ|سجل|تسجيل|اشترك|register|sign\s?up|create\s+(?:an?\s+)?account).{0,45}(?:حساب|موقع|account|website|site)|(?:حساب|account).{0,35}(?:جديد|فتح|انشاء|register|sign\s?up)/iu.test(text)) {
      setRegistrationRequest((current) => current + 1);
      setMicStatus('فتحت نموذج تجهيز التسجيل. لن تُرسل البيانات الشخصية إلى روبي.');
      return;
    }

    const appendReply = (replyText: string, generatedProduct?: { title: string; description: string; price: number; downloadUrl: string }, generatedAsset?: AgentAsset, language: AssistantLanguage = detectSpeechLanguage(replyText)) => {
      const replyId = messageIdRef.current++;
      const whatsappMessage = getCustomerWhatsAppMessage(replyText, generatedProduct ? [generatedProduct] : products.data ?? []) ?? undefined;
      conversationLanguageRef.current = language;
      setMessages((current) => [...current, {
        id: replyId,
        role: 'assistant',
        text: replyText,
        language,
        whatsappMessage,
        ...(generatedAsset ? { asset: { name: generatedAsset.name, downloadUrl: generatedAsset.downloadUrl } } : {}),
      }]);
      if (generatedProduct) void queryClient.invalidateQueries({ queryKey: getListDigitalProductsQueryKey() });
      if (generatedAsset) void queryClient.invalidateQueries({ queryKey: getListAgentAssetsQueryKey() });
      if (fromVoice) void speak(replyText, replyId, language);
    };

    setIsWaitingForReply(true);
    const history = messages.slice(-10).map(({ role, text: content }) => ({ role, content }));
    void sendAgentMessage.mutateAsync({ data: { message: text, history } })
      .then((response) => appendReply(response.reply, response.generatedProduct, response.generatedAsset, response.language))
      .catch((error: unknown) => {
        const apiError = typeof error === 'object' && error !== null ? error : null;
        const status = apiError && 'status' in apiError && typeof apiError.status === 'number'
          ? apiError.status
          : undefined;
        const errorData = apiError && 'data' in apiError && typeof apiError.data === 'object' && apiError.data !== null
          ? apiError.data
          : null;
        const serverMessage = errorData && 'error' in errorData && typeof errorData.error === 'string'
          ? errorData.error
          : undefined;
        setMicStatus(status === 503
          ? 'خدمة المساعد غير مفعّلة: أضف مفتاح API صالحاً لـ OpenRouter أو OpenAI إلى إعدادات الخادم. يمكنك متابعة استخدام الواجهة وإعادة المحاولة بعد ضبط المفتاح.'
          : serverMessage ?? 'تعذر الحصول على رد من OpenRouter. تحقق من اتصال الخادم ثم أعد المحاولة.');
      })
      .finally(() => setIsWaitingForReply(false));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(draft);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      sendMessage(draft);
    }
  }

  function handleMicButtonClick() {
    if (recognitionRef.current || isMicListening) {
      stopMicrophoneListening();
      return;
    }

    if (isWaitingForReply) {
      setMicStatus('انتظر حتى يكتمل رد روبي قبل بدء استماع جديد.');
      return;
    }

    if (!speechRecognitionConstructor) {
      setIsMicListening(false);
      setMicStatus('لا يدعم هذا المتصفح التعرّف على الكلام. يمكنك كتابة رسالتك بدلاً من ذلك.');
      return;
    }

    setMicStatus('جارٍ طلب إذن الميكروفون…');

    try {
      const recognition = new speechRecognitionConstructor();
      recognition.lang = getSpeechLocale(conversationLanguageRef.current);
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => {
        if (recognitionRef.current !== recognition) return;
        setIsMicListening(true);
        setMicStatus('أستمع الآن…');
      };
      recognition.onresult = (event) => {
        const result = event.results[event.results.length - 1];
        const transcript = result?.[0]?.transcript.trim();
        if (result?.isFinal && transcript) sendMessage(transcript, true);
      };
      recognition.onerror = (event) => {
        if (recognitionRef.current !== recognition) return;
        recognitionRef.current = null;
        setIsMicListening(false);
        setMicStatus(event.error === 'not-allowed' || event.error === 'service-not-allowed'
          ? 'حظر المتصفح الوصول إلى الميكروفون. اسمح بالإذن من إعدادات الموقع ثم حاول مجدداً.'
          : 'تعذر التعرّف على الصوت. تحقق من إذن الميكروفون ثم حاول مجدداً.');
      };
      recognition.onend = () => {
        if (recognitionRef.current !== recognition) return;
        recognitionRef.current = null;
        setIsMicListening(false);
      };
      recognitionRef.current = recognition;
      setIsMicListening(true);
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setIsMicListening(false);
      setMicStatus('تعذر بدء الميكروفون. تحقق من إذن المتصفح ومن اتصال آمن ثم حاول مجدداً.');
    }
  }

  return (
    <AppShell appearance="assistant">
      <div className="page-content assistant-page" dir="rtl">
        <PageHeading eyebrow="مساعد متجرك" title="روبي، مساعدك الذكي" description="إجابات ذكية عن إدارة المتجر والتكاملات والتصاميم، مع إدخال ونطق صوتي." />
        <div className="assistant-layout">
          <section className="panel chat-panel">
            <header className="chat-header">
              <div className="robot-face"><FeminineRobotAvatar size={46} /></div>
              <div className="assistant-identity">
                <strong>روبي</strong>
                <span>محادثة ذكية عبر خادم التطبيق</span>
              </div>
              <span className="assistant-session-state assistant-session-active"><i /> {isWaitingForReply ? 'جارٍ الرد' : 'جاهزة للمحادثة'}</span>
            </header>
            <div className="assistant-engine-strip">
              <Activity size={15} />
              <strong>محادثة روبي</strong>
              <span>جميع الرسائل وسياق المحادثة عبر OpenRouter</span>
            </div>
            <div ref={messageListRef} className="chat-messages assistant-message-list" aria-live="polite" aria-label="رسائل المحادثة">
              {messages.map((message) => (
                <article className={`chat-message ${message.role}`} key={message.id}>
                  <div className="assistant-message-meta">{message.role === 'user' ? 'أنت' : 'روبي · المساعد الذكي'}</div>
                  <p>{message.text}</p>
                  {message.role === 'assistant' && (
                    <div className="assistant-message-actions">
                      <button className={`assistant-speak-button ${speakingMessageId === message.id ? 'is-speaking' : ''}`} type="button" onClick={() => toggleSpeech(message)} aria-pressed={speakingMessageId === message.id} aria-label={speakingMessageId === message.id ? 'إيقاف النطق' : 'استمع إلى رد روبي'} title={speakingMessageId === message.id ? 'إيقاف النطق' : 'قراءة الرد بصوت الجهاز'} data-testid={`button-speech-${message.id}`}>
                        {speakingMessageId === message.id ? <Square size={13} fill="currentColor" /> : <Volume2 size={15} />}
                      </button>
                      {message.asset && (
                        <a className="assistant-whatsapp-button" href={message.asset.downloadUrl} target="_blank" rel="noreferrer" data-testid={`link-generated-asset-${message.id}`}>
                          <Download size={15} /> تنزيل {message.asset.name}
                        </a>
                      )}
                      {message.whatsappMessage && (
                        <a className="assistant-whatsapp-button" href={createWhatsAppLink(message.whatsappMessage)} target="_blank" rel="noopener noreferrer" aria-label="افتح واتساب برسالة المنتج جاهزة للإرسال" title="فتح واتساب برسالة المنتج" data-testid={`button-whatsapp-${message.id}`}>
                          <MessageCircle size={15} />
                          فتح واتساب بالرسالة
                        </a>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
            <p id="assistant-speech-note" className="assistant-disabled-note" role="status" aria-live="polite">
              {speechStatus}
            </p>
            <p id="assistant-voice-note" className="assistant-disabled-note" role="status">
              {micStatus || (isWaitingForReply
                ? 'روبي تفكر في إجابة مناسبة…'
                : speechRecognitionConstructor
                ? 'تُرسل جميع الرسائل إلى OpenRouter. يعتمد الإدخال الصوتي على دعم المتصفح.'
                : 'تُرسل جميع الرسائل إلى OpenRouter. لا يدعم هذا المتصفح الإملاء الصوتي؛ يمكنك الكتابة والاستماع للردود.')}
            </p>
          </section>
          <aside>
            <section className="panel side-note assistant-profile-panel">
              <div className="assistant-portrait-stage">
                <div className="assistant-portrait-orbit" />
                <div className="assistant-side-portrait"><FeminineRobotAvatar size={112} /></div>
                <span className="assistant-portrait-chip"><Waves size={13} /> روبي / 01</span>
              </div>
              <span className="assistant-section-label"><Sparkles size={14} /> هوية رقمية</span>
              <h3>روبي عبر خادم التطبيق</h3>
              <p>تستخدم روبي كتالوج منتجات متجرك لإنشاء منتجات رقمية جديدة وحفظها مع رابط تنزيل قابل للمشاركة.</p>
            </section>
            <section className="panel side-note assistant-integrity-panel" style={{ marginTop: 14 }}>
              <div className="assistant-note-title"><LockKeyhole size={16} /><h3>اختيارك محفوظ</h3></div>
              <p>لا تضع مفاتيح المزوّد في المحادثة أو المتصفح؛ تُحفظ على الخادم. يبقى النطق الصوتي تابعاً لدعم جهازك.</p>
              <div className="assistant-integrity-readout"><Cpu size={14} /><span>مفتاح API على الخادم</span><strong>محمي</strong></div>
            </section>
            <AgentToolsPanel registrationRequest={registrationRequest} />
          </aside>
        </div>
      </div>
      {createPortal(
        <form className="chat-compose assistant-chat-fixed-compose" onSubmit={handleSubmit}>
          <input
            className="chat-input"
            placeholder="اكتب رسالة لروبي…"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleInputKeyDown}
            disabled={isWaitingForReply}
            aria-label="رسالة لروبي"
            aria-describedby="assistant-voice-note"
            data-testid="input-assistant-message"
          />
          <button className={`btn-secondary assistant-icon-button ${isMicListening ? 'is-listening' : ''}`} type="button" onClick={handleMicButtonClick} aria-pressed={isMicListening} aria-label={isMicListening ? 'إيقاف الاستماع' : 'التحدث إلى روبي'} title={isMicListening ? 'إيقاف الاستماع' : isWaitingForReply ? 'انتظر حتى يكتمل رد روبي' : speechRecognitionConstructor ? 'إدخال صوتي عبر المتصفح' : 'الإملاء الصوتي غير مدعوم في هذا المتصفح'} data-testid="button-voice-control">
            {isMicListening ? <Square size={15} fill="currentColor" /> : <Mic size={16} />}
          </button>
          <button className={`btn-primary assistant-icon-button ${isWaitingForReply ? 'is-sending' : ''}`} type="submit" disabled={!draft.trim() || isWaitingForReply} aria-label={isWaitingForReply ? 'جارٍ إرسال الرسالة' : 'إرسال الرسالة'} title={isWaitingForReply ? 'روبي تجهز الرد' : 'إرسال الرسالة'} data-testid="button-send-message"><Send size={15} /></button>
        </form>,
        document.body,
      )}
    </AppShell>
  );
}
