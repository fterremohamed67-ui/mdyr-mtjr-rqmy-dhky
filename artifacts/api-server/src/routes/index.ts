import { Router, type IRouter } from "express";
import agentRouter from "./agent";
import healthRouter from "./health";
import whopRouter from "./whop";

const router: IRouter = Router();

router.use(healthRouter);
router.use(agentRouter);
router.use(whopRouter);

export default router;
