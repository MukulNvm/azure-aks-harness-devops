import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import metricsRouter from "./metrics";
import requestLogsRouter from "./request-logs";
import deploymentsRouter from "./deployments";
import podsRouter from "./pods";
import incidentsRouter from "./incidents";
import alertsRouter from "./alerts";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(metricsRouter);
router.use(requestLogsRouter);
router.use(deploymentsRouter);
router.use(podsRouter);
router.use(incidentsRouter);
router.use(alertsRouter);

export default router;
