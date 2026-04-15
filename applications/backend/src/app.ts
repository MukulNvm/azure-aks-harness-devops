import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { recordRequestTelemetry } from "./lib/telemetry";

const app: Express = express();

function resolveClientId(req: express.Request): string {
  const userHeader = req.header("x-user-id") ?? req.header("x-user-email");
  if (userHeader) {
    return userHeader;
  }

  const forwarded = req.header("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }

  return req.ip || "unknown";
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    recordRequestTelemetry({
      method: req.method,
      route: req.originalUrl,
      statusCode: res.statusCode,
      latencyMs: elapsedMs,
      userAgent: req.header("user-agent") ?? undefined,
      clientId: resolveClientId(req),
    });
  });

  next();
});

app.use("/api", router);

app.use(
  (
    err: Error & { issues?: unknown },
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (err.name === "ZodError") {
      res.status(400).json({ error: "Validation error", details: err.issues });
      return;
    }
    logger.error(err, "Unhandled error");
    res.status(500).json({ error: "Internal server error" });
  },
);

export default app;
