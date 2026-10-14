import { ReplitConnectors } from "@replit/connectors-sdk";
import {
  CreateStoreCheckoutBody,
  CreateStoreCheckoutResponse,
  CreateStoreProductBody,
  CreateStoreProductResponse,
  GetStoreOverviewResponse,
  GetWhopStatusResponse,
  ListStorePaymentsResponse,
  ListStorePlansResponse,
} from "@workspace/api-zod";
import { Router, type IRouter, type Request } from "express";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

type JsonRecord = Record<string, unknown>;

class WhopSetupError extends Error {}

class WhopRequestError extends Error {
  constructor(readonly statusCode: number) {
    super("Whop request failed");
  }
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getItems(payload: unknown): JsonRecord[] {
  if (Array.isArray(payload)) return payload.map(asRecord);
  const data = asRecord(payload).data;
  return Array.isArray(data) ? data.map(asRecord) : [];
}

function getCompanyId(): string {
  const companyId = process.env.WHOP_COMPANY_ID;
  if (!companyId) {
    throw new WhopSetupError(
      "Whop is connected, but needs company:basic:read permission and a configured company ID.",
    );
  }

  return companyId;
}

async function whopRequest(
  method: "GET" | "POST",
  path: string,
  body?: JsonRecord,
): Promise<unknown> {
  const connectors = new ReplitConnectors();
  const response = await connectors.proxy("whop", path, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body ? { body } : {}),
  });

  if (!response.ok) {
    throw new WhopRequestError(response.status);
  }

  return response.json();
}

function normalizePlan(value: JsonRecord): JsonRecord {
  const product = asRecord(value.product);
  const metadata = asRecord(value.metadata);
  const title =
    asString(value.title) ??
    asString(product.title) ??
    "Untitled product";
  const description =
    asString(value.description) ?? asString(product.description);
  const language =
    metadata.language === "ar" || metadata.language === "en"
      ? metadata.language
      : /[\u0600-\u06ff]/.test(`${title} ${description ?? ""}`)
        ? "ar"
        : "en";

  return {
    id: asString(value.id) ?? "",
    productId:
      asString(product.id) ?? asString(value.product_id) ?? "",
    title,
    description,
    price: asNumber(value.initial_price ?? value.renewal_price),
    currency: (asString(value.currency) ?? "usd").toUpperCase(),
    language,
    createdAt: asString(value.created_at),
  };
}

function normalizePayment(value: JsonRecord): JsonRecord {
  const user = asRecord(value.user);
  const variant = asRecord(value.plan ?? value.variant);
  const product = asRecord(variant.product);
  return {
    id: asString(value.id) ?? "",
    buyerId: asString(user.id) ?? asString(value.user_id),
    amount: asNumber(
      value.final_amount ?? value.total_amount ?? value.amount,
    ),
    currency: (asString(value.currency) ?? "usd").toUpperCase(),
    status: asString(value.status) ?? "unknown",
    buyerName:
      asString(user.name) ??
      asString(user.username) ??
      asString(value.user_name),
    productTitle: asString(product.title) ?? asString(variant.title),
    createdAt: asString(value.created_at),
  };
}

async function listPlans(): Promise<JsonRecord[]> {
  const companyId = getCompanyId();
  const params = new URLSearchParams({
    account_id: companyId,
    first: "100",
  });
  const payload = await whopRequest(
    "GET",
    `/api/v1/variants?${params.toString()}`,
  );
  return getItems(payload).map(normalizePlan);
}

async function listProducts(): Promise<JsonRecord[]> {
  const companyId = getCompanyId();
  const params = new URLSearchParams({
    account_id: companyId,
    first: "100",
  });
  const payload = await whopRequest(
    "GET",
    `/api/v1/products?${params.toString()}`,
  );
  return getItems(payload);
}

async function listPayments(): Promise<JsonRecord[]> {
  const companyId = getCompanyId();
  const params = new URLSearchParams({
    account_id: companyId,
    mode: "account_sales",
    first: "100",
  });
  const payload = await whopRequest(
    "GET",
    `/api/v1/payments?${params.toString()}`,
  );
  return getItems(payload).map(normalizePayment);
}

function sendWhopError(req: Request, res: import("express").Response, error: unknown) {
  if (error instanceof WhopRequestError) {
    req.log.warn(
      { statusCode: error.statusCode },
      "Whop request failed; check the connected account permissions",
    );
  } else {
    req.log.warn(
      { reason: error instanceof Error ? error.message : "unknown" },
      "Whop integration is not ready",
    );
  }

  const message =
    error instanceof WhopSetupError
      ? error.message
      : "Whop could not complete this request. Check the connected account permissions.";
  res.status(503).json({ error: message });
}

router.get("/whop/status", (_req, res): void => {
  const hasCompanyId = Boolean(process.env.WHOP_COMPANY_ID);
  res.json(
    GetWhopStatusResponse.parse({
      whop: hasCompanyId ? "ready" : "configuration_required",
      whatsapp: "not_connected",
      binance: "unavailable",
      ai: "upgrade_required",
      message: hasCompanyId
        ? "Whop متصل ويمكن قراءة المتجر؛ لم تُضف منتجات أو مبيعات بعد."
        : "Whop يحتاج ربط حساب الشركة وإعداد صلاحية قراءة الحساب.",
    }),
  );
});

router.get("/whop/plans", requireAuth, async (req, res): Promise<void> => {
  try {
    res.json(ListStorePlansResponse.parse(await listPlans()));
  } catch (error) {
    sendWhopError(req, res, error);
  }
});

router.post("/whop/plans", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateStoreProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const companyId = getCompanyId();
    const productPayload = asRecord(
      await whopRequest("POST", "/api/v1/products", {
        account_id: companyId,
        title: parsed.data.title,
        description: parsed.data.description,
        metadata: { language: parsed.data.language },
      }),
    );
    const productId = asString(productPayload.id);
    if (!productId) {
      throw new WhopRequestError(502);
    }

    const planPayload = asRecord(
      await whopRequest("POST", "/api/v1/variants", {
        account_id: companyId,
        product_id: productId,
        title: parsed.data.title,
        description: parsed.data.description,
        currency: parsed.data.currency,
        initial_price: parsed.data.price,
        billing_period: null,
        release_method: "buy_now",
        visibility: "visible",
        metadata: { language: parsed.data.language },
      }),
    );
    const plan = normalizePlan({
      ...planPayload,
      product: {
        id: productId,
        title: parsed.data.title,
        description: parsed.data.description,
      },
      metadata: { language: parsed.data.language },
    });

    res.status(201).json(CreateStoreProductResponse.parse(plan));
  } catch (error) {
    sendWhopError(req, res, error);
  }
});

router.post("/whop/checkout", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateStoreCheckoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const companyId = getCompanyId();
    const payload = asRecord(
      await whopRequest("POST", "/api/v1/checkout_configurations", {
        account_id: companyId,
        plan_id: parsed.data.planId,
      }),
    );
    const purchaseUrl =
      asString(payload.purchase_url) ?? asString(payload.url);
    if (!purchaseUrl) {
      throw new WhopRequestError(502);
    }
    res.json(CreateStoreCheckoutResponse.parse({ purchaseUrl }));
  } catch (error) {
    sendWhopError(req, res, error);
  }
});

router.get("/whop/payments", requireAuth, async (req, res): Promise<void> => {
  try {
    res.json(ListStorePaymentsResponse.parse(await listPayments()));
  } catch (error) {
    sendWhopError(req, res, error);
  }
});

router.get("/whop/overview", requireAuth, async (req, res): Promise<void> => {
  try {
    const [payments, plans, products] = await Promise.all([
      listPayments(),
      listPlans(),
      listProducts(),
    ]);
    const successfulPayments = payments.filter((payment) =>
      ["succeeded", "paid", "completed"].includes(
        String(payment.status).toLowerCase(),
      ),
    );
    const customerIds = new Set(
      payments
        .map((payment) => asString(payment.buyerId))
        .filter((id): id is string => Boolean(id)),
    );
    const revenue = successfulPayments.reduce(
      (total, payment) =>
        String(payment.currency).toUpperCase() === "USD"
          ? total + asNumber(payment.amount)
          : total,
      0,
    );
    res.json(
      GetStoreOverviewResponse.parse({
        currency: "USD",
        revenue,
        paymentCount: successfulPayments.length,
        customerCount: customerIds.size,
        productCount: products.length,
        recentPayments: payments.slice(0, 6),
        integrationState: "ready",
      }),
    );
  } catch (error) {
    sendWhopError(req, res, error);
  }
});

export default router;
