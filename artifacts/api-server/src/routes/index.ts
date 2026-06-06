import { Router, type IRouter } from "express";
import healthRouter from "./health";
import kortexRouter from "./kortex";

const router: IRouter = Router();

router.use(healthRouter);
router.use(kortexRouter);

export default router;
