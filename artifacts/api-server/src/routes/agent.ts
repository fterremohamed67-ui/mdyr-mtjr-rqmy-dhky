import { SendAgentMessageBody } from "@workspace/api-zod";
import { Router, type IRouter, type Request } from "express";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.post("/agent/chat", requireAuth, (req: Request, res): void => {
  const parsed = SendAgentMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  req.log.warn("AI service is not enabled for this project");
  res.status(503).json({
    error:
      "خدمة المساعد غير مفعّلة حالياً. يتطلب تشغيلها تفعيل تكامل الذكاء الاصطناعي.",
  });
});

export default router;
