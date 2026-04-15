import { Router, type IRouter } from "express";
import { GetRequestLogsResponse } from "@workspace/api-zod";
import { getRecentRequestLogs } from "../lib/telemetry";

const router: IRouter = Router();

router.get("/request-logs", (_req, res): void => {
  const logs = getRecentRequestLogs(100);
  res.json(GetRequestLogsResponse.parse(logs));
});

export default router;
