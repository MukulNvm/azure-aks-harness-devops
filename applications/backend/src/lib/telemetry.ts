export interface RequestLogEntry {
  id: string;
  timestamp: string;
  method: string;
  route: string;
  statusCode: number;
  latencyMs: number;
  userAgent?: string;
}

export interface RequestCounterEntry {
  method: string;
  route: string;
  statusCode: string;
  count: number;
}

export interface RouteHistogramEntry {
  route: string;
  bucketCounts: number[];
  sumSeconds: number;
  count: number;
}

export interface TelemetrySnapshot {
  requestCounters: RequestCounterEntry[];
  routeHistograms: RouteHistogramEntry[];
  activeClients: number;
}

const MAX_LOG_ENTRIES = 500;
const ACTIVE_CLIENT_WINDOW_MS = 15 * 60 * 1000;

const LATENCY_BUCKETS_SECONDS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5];

let requestSequence = 0;
const requestLogs: RequestLogEntry[] = [];
const requestCounters = new Map<string, number>();
const routeHistograms = new Map<string, RouteHistogramEntry>();
const activeClients = new Map<string, number>();

function normalizeRoute(rawRoute: string): string {
  const noQuery = (rawRoute || "/").split("?")[0] || "/";
  return noQuery
    .replace(/\/[0-9]+(?=\/|$)/g, "/:id")
    .replace(/\/[0-9a-fA-F]{8}-[0-9a-fA-F-]{27,}(?=\/|$)/g, "/:id");
}

function pruneInactiveClients(nowMs: number): void {
  for (const [clientId, lastSeen] of activeClients.entries()) {
    if (nowMs - lastSeen > ACTIVE_CLIENT_WINDOW_MS) {
      activeClients.delete(clientId);
    }
  }
}

function ensureHistogram(route: string): RouteHistogramEntry {
  const existing = routeHistograms.get(route);
  if (existing) {
    return existing;
  }

  const created: RouteHistogramEntry = {
    route,
    // Last bucket represents +Inf.
    bucketCounts: new Array(LATENCY_BUCKETS_SECONDS.length + 1).fill(0),
    sumSeconds: 0,
    count: 0,
  };
  routeHistograms.set(route, created);
  return created;
}

function getBucketIndex(latencySeconds: number): number {
  for (let i = 0; i < LATENCY_BUCKETS_SECONDS.length; i += 1) {
    if (latencySeconds <= LATENCY_BUCKETS_SECONDS[i]) {
      return i;
    }
  }
  return LATENCY_BUCKETS_SECONDS.length;
}

export function getLatencyBucketsSeconds(): number[] {
  return LATENCY_BUCKETS_SECONDS;
}

export function recordRequestTelemetry(input: {
  method: string;
  route: string;
  statusCode: number;
  latencyMs: number;
  userAgent?: string;
  clientId?: string;
}): void {
  const nowMs = Date.now();
  const normalizedRoute = normalizeRoute(input.route);

  requestSequence += 1;
  const entry: RequestLogEntry = {
    id: `req-${requestSequence.toString().padStart(8, "0")}`,
    timestamp: new Date(nowMs).toISOString(),
    method: input.method,
    route: normalizedRoute,
    statusCode: input.statusCode,
    latencyMs: Math.max(0, Math.round(input.latencyMs * 100) / 100),
    userAgent: input.userAgent,
  };

  requestLogs.push(entry);
  if (requestLogs.length > MAX_LOG_ENTRIES) {
    requestLogs.splice(0, requestLogs.length - MAX_LOG_ENTRIES);
  }

  const counterKey = `${input.method}|${normalizedRoute}|${input.statusCode}`;
  requestCounters.set(counterKey, (requestCounters.get(counterKey) ?? 0) + 1);

  const histogram = ensureHistogram(normalizedRoute);
  const latencySeconds = Math.max(0, input.latencyMs) / 1000;
  const bucketIndex = getBucketIndex(latencySeconds);
  histogram.bucketCounts[bucketIndex] += 1;
  histogram.sumSeconds += latencySeconds;
  histogram.count += 1;

  if (input.clientId && input.clientId.trim() !== "") {
    activeClients.set(input.clientId.trim(), nowMs);
  }

  pruneInactiveClients(nowMs);
}

export function getRecentRequestLogs(limit = 100): RequestLogEntry[] {
  return requestLogs.slice(-limit).reverse();
}

export function getTelemetrySnapshot(): TelemetrySnapshot {
  const nowMs = Date.now();
  pruneInactiveClients(nowMs);

  const counters: RequestCounterEntry[] = [];
  for (const [key, count] of requestCounters.entries()) {
    const [method, route, statusCode] = key.split("|");
    counters.push({ method, route, statusCode, count });
  }

  return {
    requestCounters: counters,
    routeHistograms: Array.from(routeHistograms.values()).map((entry) => ({
      route: entry.route,
      bucketCounts: [...entry.bucketCounts],
      sumSeconds: entry.sumSeconds,
      count: entry.count,
    })),
    activeClients: activeClients.size,
  };
}
