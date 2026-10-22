import { Router, type IRouter } from "express";
import agentAssetsRouter from "./agent-assets";
import agentRouter from "./agent";
import digitalProductsRouter from "./digital-products";
import healthRouter from "./health";
import whopRouter from "./whop";

const router: IRouter = Router();

router.use(healthRouter);
router.use(agentAssetsRouter);
router.use(agentRouter);
router.use(digitalProductsRouter);
router.use(whopRouter);

export default router;
