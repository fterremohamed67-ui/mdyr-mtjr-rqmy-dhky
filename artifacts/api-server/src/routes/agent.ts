import { SendAgentMessageBody } from "@workspace/api-zod";
import { getAuth } from "@clerk/express";
import { Router, type IRouter, type Request } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { createDigitalProduct, getPublicOrigin, listDigitalProducts } from "../lib/digital-products";
import { saveAgentAsset } from "../lib/agent-assets";
import {
  AiProviderError,
  detectAssistantLanguage,
  generateAssistantReply,
  isAiProviderConfigured,
  isSpeechProviderConfigured,
  synthesizeAssistantSpeech,
} from "../lib/ai-provider";

const router: IRouter = Router();

function getAiProviderFailure(error: unknown): { status: number; message: string } {
  if (error instanceof AiProviderError) {
    if (error.status === 401) return { status: 502, message: "رفض OpenRouter مفتاح API. تحقق من المفتاح المحفوظ في إعدادات الخادم." };
    if (error.status === 402) return { status: 502, message: "رصيد OpenRouter غير كافٍ لإكمال الطلب." };
    if (error.status === 403) return { status: 502, message: "مفتاح OpenRouter لا يملك صلاحية استخدام النموذج المحدد." };
    if (error.status === 404) return { status: 502, message: "نموذج OpenRouter المحدد غير موجود. تحقق من OPENROUTER_MODEL." };
    if (error.status === 429) return { status: 503, message: "تم تجاوز حد طلبات OpenRouter. انتظر قليلًا ثم أعد المحاولة." };
    return { status: 502, message: `رفض OpenRouter الطلب (HTTP ${error.status}). تحقق من إعدادات النموذج والمزوّد.` };
  }

  if (error instanceof Error && error.name === "TimeoutError") {
    return { status: 504, message: "استغرق اتصال OpenRouter وقتًا أطول من المتوقع. أعد المحاولة بعد قليل." };
  }
  if (error instanceof TypeError) {
    return { status: 502, message: "تعذر الاتصال بخدمة OpenRouter من الخادم. تحقق من اتصال الخادم بالإنترنت." };
  }
  return { status: 502, message: "تعذر الحصول على رد من خدمة OpenRouter. راجع سجل الخادم ثم أعد المحاولة." };
}

router.post("/agent/chat", requireAuth, async (req: Request, res): Promise<void> => {
  const parsed = SendAgentMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (!isAiProviderConfigured()) {
    res.status(503).json({
      error: "خدمة المساعد غير مفعّلة. أضف إعداد OpenRouter أو OpenAI إلى بيئة الخادم.",
    });
    return;
  }

  try {
    let ownerId: string;
    try {
      ownerId = getAuth(req).userId ?? "local-development";
    } catch {
      ownerId = "local-development";
    }
    const products = await listDigitalProducts(ownerId);
    const result = await generateAssistantReply(parsed.data.message, parsed.data.history, products);
    const generatedProduct = result.productDraft
      ? await createDigitalProduct(
        ownerId,
        result.productDraft,
        getPublicOrigin(req),
      )
      : undefined;
    const generatedAsset = result.designArtifactDraft
      ? await saveAgentAsset(
        ownerId,
        result.designArtifactDraft.name,
        result.designArtifactDraft.contentType,
        Buffer.from(result.designArtifactDraft.content, 'utf8'),
        getPublicOrigin(req),
      )
      : undefined;
    const language = detectAssistantLanguage(parsed.data.message);
    const productReply = language === "fr"
      ? `Le produit numérique a été créé et ajouté à votre catalogue.\n\n${generatedProduct?.title}\n${generatedProduct?.description}\nPrix : ${generatedProduct?.price} USD\nLien de téléchargement : ${generatedProduct?.downloadUrl}\n\nMessage WhatsApp pour le client :\nBonjour ! Je suis ravi(e) de vous présenter ${generatedProduct?.title}. ${generatedProduct?.description}\nPrix : ${generatedProduct?.price} USD\nLien de téléchargement : ${generatedProduct?.downloadUrl}`
      : language === "en"
        ? `The digital product has been created and added to your catalog.\n\n${generatedProduct?.title}\n${generatedProduct?.description}\nPrice: ${generatedProduct?.price} USD\nDownload link: ${generatedProduct?.downloadUrl}\n\nWhatsApp message for the customer:\nHello! I’m happy to share ${generatedProduct?.title} with you. ${generatedProduct?.description}\nPrice: ${generatedProduct?.price} USD\nDownload link: ${generatedProduct?.downloadUrl}`
        : `تم إنشاء المنتج وحفظه في كتالوجك الرقمي.\n\n${generatedProduct?.title}\n${generatedProduct?.description}\nالسعر: ${generatedProduct?.price} دولار\nرابط التنزيل: ${generatedProduct?.downloadUrl}\n\nرسالة واتساب للعميل:\nمرحباً! يسعدني مشاركة ${generatedProduct?.title} معك. ${generatedProduct?.description}\nالسعر: ${generatedProduct?.price} دولار\nرابط التنزيل: ${generatedProduct?.downloadUrl}`;
    const reply = generatedProduct
      ? productReply
      : generatedAsset
        ? `${result.reply}\n\n${generatedAsset.name}\n${language === "fr" ? "Lien de téléchargement" : language === "en" ? "Download link" : "رابط التنزيل"}: ${generatedAsset.downloadUrl}`
        : result.reply;
    res.status(200).json({
      reply,
      language,
      ...(generatedProduct ? { generatedProduct } : {}),
      ...(generatedAsset ? { generatedAsset } : {}),
    });
  } catch (error) {
    req.log.error({ err: error }, "AI provider request failed");
    const failure = getAiProviderFailure(error);
    res.status(failure.status).json({ error: failure.message });
  }
});

router.post("/agent/speech", requireAuth, async (req: Request, res): Promise<void> => {
  const parsed = SendAgentMessageBody.safeParse({ message: req.body?.text });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (!isSpeechProviderConfigured()) {
    res.status(503).json({ error: "خدمة النطق السحابي غير مفعّلة." });
    return;
  }

  try {
    const result = await synthesizeAssistantSpeech(parsed.data.message);
    res.status(200).type(result.contentType).send(result.audio);
  } catch (error) {
    req.log.error({ err: error }, "Speech provider request failed");
    res.status(502).json({ error: "تعذر إنشاء الصوت من المزوّد." });
  }
});

export default router;
