import { getAuth } from "@clerk/express";
import type { RequestHandler } from "express";

export const requireAuth: RequestHandler = (req, res, next) => {
  if (!process.env.CLERK_SECRET_KEY || !process.env.CLERK_PUBLISHABLE_KEY) {
    const localDevelopmentRequest =
      process.env.NODE_ENV === "development" &&
      ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.ip ?? "");
    if (localDevelopmentRequest) {
      req.log.warn({ ip: req.ip }, "Bypassing auth for local development request");
      next();
      return;
    }
    req.log.warn({ ip: req.ip }, "Authentication is not configured");
    res.status(401).json({ error: "Authentication is not configured" });
    return;
  }

  try {
    if (!getAuth(req).userId) {
      req.log.warn({ ip: req.ip }, "Authentication required");
      res.status(401).json({ error: "Sign-in required" });
      return;
    }
    next();
  } catch {
    req.log.warn({ ip: req.ip }, "Authentication required");
    res.status(401).json({ error: "Sign-in required" });
  }
};
