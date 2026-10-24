import { Router, type IRouter } from "express";
import agentAssetsRouter from "./agent-assets.js";
import agentRouter from "./agent.js";
import digitalProductsRouter from "./digital-products.js";
import healthRouter from "./health.js";
import whopRouter from "./whop.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(agentAssetsRouter);
router.use(agentRouter);
router.use(digitalProductsRouter);
router.use(whopRouter);

export default router;
