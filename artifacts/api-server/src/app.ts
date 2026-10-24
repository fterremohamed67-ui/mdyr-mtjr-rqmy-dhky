// @ts-nocheck
import express, { type Express } from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes/index.js";
import { logger } from "./lib/logger";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";

const app: Express = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const configuredOrigins = process.env.CORS_ORIGIN
  ?.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    credentials: true,
    origin:
      configuredOrigins?.length
        ? configuredOrigins
        : process.env.NODE_ENV === 'production'
          ? true
          : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

const clerkConfigured = Boolean(
  process.env.CLERK_SECRET_KEY && process.env.CLERK_PUBLISHABLE_KEY,
);

if (clerkConfigured) {
  app.use(
    clerkMiddleware((req) => ({
      publishableKey: publishableKeyFromHost(
        getClerkProxyHost(req) ?? '',
        process.env.CLERK_PUBLISHABLE_KEY,
      ),
    })),
  );
}

app.use("/api", router);

export default app;
