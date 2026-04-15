import { Router, type IRouter } from "express";
import { GetPodsResponse } from "@workspace/api-zod";
import { logger } from "../lib/logger";
import {
  type K8sPod,
  formatK8sAge,
  getTargetNamespace,
  listPodMetrics,
  listPods,
  namespaceToEnvironment,
  parseCpuToMillicores,
} from "../lib/kubernetes";

const router: IRouter = Router();

function inferPodStatus(pod: K8sPod): string {
  const statuses = pod.status?.containerStatuses ?? [];
  const waitingReason = statuses.find((s) => s.state?.waiting?.reason)?.state?.waiting?.reason;
  if (waitingReason) {
    return waitingReason;
  }

  const terminatedReason = statuses.find((s) => s.state?.terminated?.reason)?.state?.terminated?.reason;
  if (terminatedReason) {
    return terminatedReason;
  }

  if (pod.status?.phase === "Running" && statuses.some((s) => s.ready === false)) {
    return "Pending";
  }

  return pod.status?.phase ?? "Unknown";
}

function getRequestedCpuMillicores(pod: K8sPod): number {
  return (pod.spec?.containers ?? []).reduce((total, container) => {
    const requested =
      container.resources?.requests?.cpu ?? container.resources?.limits?.cpu;
    return total + parseCpuToMillicores(requested);
  }, 0);
}

function toCpuPercent(usageMillicores: number, requestedMillicores: number): number {
  const baseline = requestedMillicores > 0 ? requestedMillicores : 1000;
  return Math.round((usageMillicores / baseline) * 1000) / 10;
}

router.get("/pods", async (_req, res): Promise<void> => {
  const namespace = getTargetNamespace();
  const environment = namespaceToEnvironment(namespace);

  try {
    const [pods, metricsMap] = await Promise.all([
      listPods(namespace),
      listPodMetrics(namespace),
    ]);

    const podRows = pods
      .map((pod) => {
        const name = pod.metadata?.name ?? "unknown";
        const metrics = metricsMap.get(name);
        const cpuUsageMillicores = metrics?.cpuMillicores ?? 0;
        const memoryMb = Math.max(0, Math.round((metrics?.memoryBytes ?? 0) / (1024 * 1024)));

        const restarts = (pod.status?.containerStatuses ?? []).reduce(
          (sum, status) => sum + (status.restartCount ?? 0),
          0,
        );

        return {
          name,
          status: inferPodStatus(pod),
          restarts,
          cpuPercent: toCpuPercent(cpuUsageMillicores, getRequestedCpuMillicores(pod)),
          memoryMb,
          node: pod.spec?.nodeName ?? "unknown",
          age: formatK8sAge(pod.metadata?.creationTimestamp),
          namespace,
          environment,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const parsed = GetPodsResponse.parse(
      podRows.map(({ environment: _environment, ...pod }) => pod),
    );

    const response = parsed.map((pod, index) => ({
      ...pod,
      environment: podRows[index]?.environment,
    }));

    res.json(response);
  } catch (error) {
    logger.warn({ error, namespace }, "Failed to read pod health from Kubernetes API");
    res.json([]);
  }
});

export default router;
