export interface LatencyPercentiles {
  route: string;
  p50: number;
  p95: number;
  p99: number;
}

export interface ParsedMetrics {
  totals: number;
  errorRate: number;
  requestsByRoute: { name: string; total: number }[];
  requestsByStatusCode: { name: string; total: number }[];
  uptimeSeconds: number | null;
  latencyPercentiles: LatencyPercentiles[];
}

export function parsePrometheusMetrics(text: string | undefined | null): ParsedMetrics {
  const result: ParsedMetrics = {
    totals: 0,
    errorRate: 0,
    requestsByRoute: [],
    requestsByStatusCode: [],
    uptimeSeconds: null,
    latencyPercentiles: [],
  };

  if (!text) return result;

  const routeMap = new Map<string, number>();
  const statusMap = new Map<string, number>();
  let totalRequests = 0;
  let errorRequests = 0;

  const bucketsByRoute = new Map<string, { le: number; count: number }[]>();

  const lines = text.split('\n');

  for (const line of lines) {
    if (line.startsWith('#') || line.trim() === '') continue;

    if (line.startsWith('devops_harness_http_requests_total')) {
      const match = line.match(/devops_harness_http_requests_total\{(.*?)\}\s+(\d+(\.\d+)?)/);
      if (match) {
        const labelsStr = match[1];
        const value = parseFloat(match[2]);

        totalRequests += value;

        const routeMatch = labelsStr.match(/route="([^"]+)"/);
        const statusMatch = labelsStr.match(/status_code="([^"]+)"/);

        if (routeMatch) {
          const route = routeMatch[1];
          routeMap.set(route, (routeMap.get(route) || 0) + value);
        }

        if (statusMatch) {
          const status = statusMatch[1];
          statusMap.set(status, (statusMap.get(status) || 0) + value);

          if (status.startsWith('4') || status.startsWith('5')) {
            errorRequests += value;
          }
        }
      }
    }

    if (line.startsWith('devops_harness_http_request_duration_seconds_bucket')) {
      const match = line.match(/le="([^"]+)",route="([^"]+)"\}\s+(\d+)/);
      if (match) {
        const le = match[1] === "+Inf" ? Infinity : parseFloat(match[1]);
        const route = match[2];
        const count = parseInt(match[3], 10);

        if (!bucketsByRoute.has(route)) {
          bucketsByRoute.set(route, []);
        }
        bucketsByRoute.get(route)!.push({ le, count });
      }
    }

    if (line.startsWith('process_uptime_seconds')) {
      const match = line.match(/process_uptime_seconds\s+(\d+(\.\d+)?)/);
      if (match) {
        result.uptimeSeconds = parseFloat(match[1]);
      }
    }
  }

  result.totals = totalRequests;
  result.errorRate = totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0;

  result.requestsByRoute = Array.from(routeMap.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);

  result.requestsByStatusCode = Array.from(statusMap.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const [route, buckets] of bucketsByRoute) {
    const sorted = buckets.filter(b => b.le !== Infinity).sort((a, b) => a.le - b.le);
    if (sorted.length === 0) continue;

    const totalCount = buckets.find(b => b.le === Infinity)?.count || sorted[sorted.length - 1].count;

    const getPercentile = (p: number): number => {
      const target = totalCount * p;
      for (const bucket of sorted) {
        if (bucket.count >= target) {
          return bucket.le * 1000;
        }
      }
      return sorted[sorted.length - 1].le * 1000;
    };

    result.latencyPercentiles.push({
      route,
      p50: Math.round(getPercentile(0.5) * 10) / 10,
      p95: Math.round(getPercentile(0.95) * 10) / 10,
      p99: Math.round(getPercentile(0.99) * 10) / 10,
    });
  }

  return result;
}
