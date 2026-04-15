import { Router, type IRouter } from "express";
import { GetAlertConfigResponse, UpdateAlertConfigBody } from "@workspace/api-zod";

const router: IRouter = Router();

let alertConfig = {
  errorRateWarning: 2,
  errorRateCritical: 5,
  latencyP95Warning: 200,
  latencyP95Critical: 500,
  podRestartWarning: 3,
  podRestartCritical: 10,
};

router.get("/alerts/config", (_req, res): void => {
  res.json(GetAlertConfigResponse.parse(alertConfig));
});

router.put("/alerts/config", (req, res): void => {
  const body = UpdateAlertConfigBody.parse(req.body);
  alertConfig = { ...alertConfig, ...body };
  res.json(GetAlertConfigResponse.parse(alertConfig));
});

export default router;
