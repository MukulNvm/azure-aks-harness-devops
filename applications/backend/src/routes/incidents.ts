import { Router, type IRouter } from "express";
import { GetIncidentsResponse } from "@workspace/api-zod";
import { logger } from "../lib/logger";
import {
  type K8sEvent,
  getTargetNamespace,
  listWarningEvents,
  namespaceToEnvironment,
} from "../lib/kubernetes";

const router: IRouter = Router();

interface IncidentWithEnvironment {
  id: string;
  title: string;
  severity: string;
  status: string;
  startedAt: string;
  resolvedAt: string | null;
  durationMinutes: number | null;
  rootCause: string | null;
  environment?: string;
}

function toIsoOrNow(value?: string): string {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function mapSeverity(event: K8sEvent): string {
  const text = `${event.reason ?? ""} ${event.message ?? ""}`.toLowerCase();
  if (
    text.includes("crashloop") ||
    text.includes("oom") ||
    text.includes("failedscheduling") ||
    text.includes("unhealthy") ||
    text.includes("backoff") ||
    text.includes("evicted")
  ) {
    return "critical";
  }
  if (text.includes("warning") || text.includes("failed") || text.includes("notready")) {
    return "warning";
  }
  return "info";
}

function mapEventToIncident(event: K8sEvent, environment: string, index: number): IncidentWithEnvironment {
  const startedAt = toIsoOrNow(
    event.firstTimestamp ?? event.eventTime ?? event.metadata?.creationTimestamp,
  );
  const lastSeenAt = toIsoOrNow(
    event.lastTimestamp ?? event.eventTime ?? event.metadata?.creationTimestamp,
  );

  const ageMs = Date.now() - new Date(lastSeenAt).getTime();
  const isActive = ageMs <= 30 * 60 * 1000;

  const durationMs =
    new Date(lastSeenAt).getTime() - new Date(startedAt).getTime();
  const durationMinutes = durationMs > 0 ? Math.round(durationMs / (1000 * 60)) : null;

  const uid = event.metadata?.uid?.replace(/-/g, "").slice(0, 8);
  const incidentId = `INC-${uid || String(index + 1).padStart(4, "0")}`;
  const objectName = event.involvedObject?.name;
  const titlePrefix = event.reason ?? "Cluster warning";
  const title = objectName ? `${titlePrefix} (${objectName})` : titlePrefix;

  return {
    id: incidentId,
    title,
    severity: mapSeverity(event),
    status: isActive ? "investigating" : "resolved",
    startedAt,
    resolvedAt: isActive ? null : lastSeenAt,
    durationMinutes: isActive ? null : durationMinutes,
    rootCause: isActive ? null : event.message ?? null,
    environment,
  };
}

function parseConfiguredIncidents(): IncidentWithEnvironment[] {
  const raw = process.env.DASHBOARD_INCIDENTS_JSON;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const record = item as Record<string, unknown>;

        const id = typeof record["id"] === "string" ? record["id"] : "";
        const title = typeof record["title"] === "string" ? record["title"] : "";
        const severity = typeof record["severity"] === "string" ? record["severity"] : "warning";
        const status = typeof record["status"] === "string" ? record["status"] : "investigating";
        const startedAt = typeof record["startedAt"] === "string" ? toIsoOrNow(record["startedAt"]) : new Date().toISOString();

        if (!id || !title) return null;

        const resolvedAt =
          typeof record["resolvedAt"] === "string" ? toIsoOrNow(record["resolvedAt"]) : null;
        const durationMinutes =
          typeof record["durationMinutes"] === "number" ? record["durationMinutes"] : null;
        const rootCause =
          typeof record["rootCause"] === "string" ? record["rootCause"] : null;
        const environment =
          typeof record["environment"] === "string" ? record["environment"] : undefined;

        return {
          id,
          title,
          severity,
          status,
          startedAt,
          resolvedAt,
          durationMinutes,
          rootCause,
          environment,
        };
      })
      .filter((incident): incident is IncidentWithEnvironment => Boolean(incident));
  } catch {
    return [];
  }
}

router.get("/incidents", async (_req, res): Promise<void> => {
  const namespace = getTargetNamespace();
  const environment = namespaceToEnvironment(namespace);

  try {
    const [warningEvents, configuredIncidents] = await Promise.all([
      listWarningEvents(namespace),
      Promise.resolve(parseConfiguredIncidents()),
    ]);

    const mapped = warningEvents.map((event, index) =>
      mapEventToIncident(event, environment, index),
    );

    const incidents = [...configuredIncidents, ...mapped]
      .sort(
        (a, b) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
      )
      .slice(0, 100);

    const parsed = GetIncidentsResponse.parse(
      incidents.map(({ environment: _environment, ...incident }) => incident),
    );

    const response = parsed.map((incident, index) => ({
      ...incident,
      environment: incidents[index]?.environment,
    }));

    res.json(response);
  } catch (error) {
    logger.warn({ error, namespace }, "Failed to build incident timeline from Kubernetes events");
    res.json([]);
  }
});

export default router;
