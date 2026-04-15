import { Router, type IRouter } from "express";
import { getLatencyBucketsSeconds, getTelemetrySnapshot } from "../lib/telemetry";

const router: IRouter = Router();

function escapeLabelValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\"/g, "\\\"");
}

function buildMetrics(): string {
  const telemetry = getTelemetrySnapshot();
  const latencyBuckets = getLatencyBucketsSeconds();
  const lines: string[] = [];

  lines.push("# HELP devops_harness_http_requests_total Total HTTP requests");
  lines.push("# TYPE devops_harness_http_requests_total counter");

  for (const d of telemetry.requestCounters) {
    lines.push(
      `devops_harness_http_requests_total{method="${escapeLabelValue(d.method)}",route="${escapeLabelValue(d.route)}",status_code="${escapeLabelValue(d.statusCode)}"} ${d.count}`
    );
  }

  lines.push("");
  lines.push(
    "# HELP devops_harness_http_request_duration_seconds HTTP request duration histogram"
  );
  lines.push(
    "# TYPE devops_harness_http_request_duration_seconds histogram"
  );

  for (const routeHistogram of telemetry.routeHistograms) {
    let cumulative = 0;
    const routeLabel = escapeLabelValue(routeHistogram.route);

    for (let i = 0; i < latencyBuckets.length; i++) {
      cumulative += routeHistogram.bucketCounts[i] ?? 0;
      lines.push(
        `devops_harness_http_request_duration_seconds_bucket{le="${latencyBuckets[i]}",route="${routeLabel}"} ${cumulative}`
      );
    }

    cumulative += routeHistogram.bucketCounts[latencyBuckets.length] ?? 0;
    lines.push(
      `devops_harness_http_request_duration_seconds_bucket{le="+Inf",route="${routeLabel}"} ${cumulative}`
    );
    lines.push(
      `devops_harness_http_request_duration_seconds_sum{route="${routeLabel}"} ${routeHistogram.sumSeconds.toFixed(6)}`
    );
    lines.push(
      `devops_harness_http_request_duration_seconds_count{route="${routeLabel}"} ${routeHistogram.count}`
    );
  }

  lines.push("");
  lines.push(`# HELP process_uptime_seconds Process uptime`);
  lines.push(`# TYPE process_uptime_seconds gauge`);
  lines.push(`process_uptime_seconds ${Math.floor(process.uptime())}`);

  lines.push("");
  lines.push(`# HELP nodejs_heap_size_used_bytes Node.js heap used bytes`);
  lines.push(`# TYPE nodejs_heap_size_used_bytes gauge`);
  const memUsage = process.memoryUsage();
  lines.push(`nodejs_heap_size_used_bytes ${memUsage.heapUsed}`);

  lines.push("");
  lines.push("# HELP devops_harness_active_users Active clients seen in the last 15 minutes");
  lines.push("# TYPE devops_harness_active_users gauge");
  lines.push(`devops_harness_active_users ${telemetry.activeClients}`);

  lines.push("");

  return lines.join("\n");
}

router.get("/metrics", (_req, res): void => {
  res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
  res.send(buildMetrics());
});

export default router;
