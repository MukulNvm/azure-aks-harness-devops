import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { request as httpsRequest } from "node:https";
import { promisify } from "node:util";
import { logger } from "./logger";

const execFileAsync = promisify(execFile);

const SERVICE_ACCOUNT_BASE = "/var/run/secrets/kubernetes.io/serviceaccount";
const TOKEN_PATH = `${SERVICE_ACCOUNT_BASE}/token`;
const CA_PATH = `${SERVICE_ACCOUNT_BASE}/ca.crt`;
const NAMESPACE_PATH = `${SERVICE_ACCOUNT_BASE}/namespace`;

const K8S_SERVICE_HOST = process.env.KUBERNETES_SERVICE_HOST;
const K8S_SERVICE_PORT = Number(process.env.KUBERNETES_SERVICE_PORT_HTTPS ?? "443");

let warnedInClusterAccess = false;
let warnedKubectlAccess = false;

export interface K8sMetadata {
  name?: string;
  uid?: string;
  creationTimestamp?: string;
  annotations?: Record<string, string>;
  ownerReferences?: Array<{ kind?: string; name?: string }>;
}

export interface K8sPod {
  metadata?: K8sMetadata;
  spec?: {
    nodeName?: string;
    containers?: Array<{
      resources?: {
        limits?: { cpu?: string; memory?: string };
        requests?: { cpu?: string; memory?: string };
      };
    }>;
  };
  status?: {
    phase?: string;
    containerStatuses?: Array<{
      restartCount?: number;
      ready?: boolean;
      state?: {
        waiting?: { reason?: string };
        terminated?: { reason?: string };
      };
    }>;
  };
}

export interface K8sDeployment {
  metadata?: K8sMetadata;
  spec?: {
    template?: {
      spec?: {
        containers?: Array<{ image?: string }>;
      };
    };
  };
  status?: {
    readyReplicas?: number;
    updatedReplicas?: number;
  };
}

export interface K8sReplicaSet {
  metadata?: K8sMetadata;
  spec?: {
    template?: {
      spec?: {
        containers?: Array<{ image?: string }>;
      };
    };
  };
  status?: {
    replicas?: number;
    availableReplicas?: number;
  };
}

export interface K8sEvent {
  metadata?: K8sMetadata;
  type?: string;
  reason?: string;
  message?: string;
  firstTimestamp?: string;
  lastTimestamp?: string;
  eventTime?: string;
  involvedObject?: {
    kind?: string;
    name?: string;
  };
}

interface K8sListResponse<T> {
  items?: T[];
}

interface InClusterAuth {
  host: string;
  port: number;
  token: string;
  ca: Buffer;
}

function getDefaultNamespace(): string {
  if (process.env.AKS_NAMESPACE) return process.env.AKS_NAMESPACE;
  if (process.env.K8S_NAMESPACE) return process.env.K8S_NAMESPACE;
  if (process.env.NAMESPACE) return process.env.NAMESPACE;

  if (existsSync(NAMESPACE_PATH)) {
    return readFileSync(NAMESPACE_PATH, "utf8").trim();
  }

  return "production";
}

export function getTargetNamespace(): string {
  return getDefaultNamespace();
}

export function namespaceToEnvironment(namespace: string): string {
  const lower = namespace.toLowerCase();
  if (lower.includes("prod")) return "production";
  if (lower.includes("stage")) return "staging";
  if (lower.includes("dev")) return "dev";
  return namespace;
}

function getInClusterAuth(): InClusterAuth | null {
  if (!K8S_SERVICE_HOST || !existsSync(TOKEN_PATH) || !existsSync(CA_PATH)) {
    return null;
  }

  return {
    host: K8S_SERVICE_HOST,
    port: K8S_SERVICE_PORT,
    token: readFileSync(TOKEN_PATH, "utf8").trim(),
    ca: readFileSync(CA_PATH),
  };
}

async function getInClusterJson<T>(path: string): Promise<T | null> {
  const auth = getInClusterAuth();
  if (!auth) {
    return null;
  }

  return new Promise<T | null>((resolve) => {
    const req = httpsRequest(
      {
        hostname: auth.host,
        port: auth.port,
        path,
        method: "GET",
        headers: {
          Authorization: `Bearer ${auth.token}`,
          Accept: "application/json",
        },
        ca: auth.ca,
        rejectUnauthorized: true,
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk: string) => {
          body += chunk;
        });
        res.on("end", () => {
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            if (!warnedInClusterAccess) {
              warnedInClusterAccess = true;
              logger.warn({ path, statusCode: res.statusCode }, "In-cluster Kubernetes API request failed");
            }
            resolve(null);
            return;
          }

          try {
            resolve(JSON.parse(body) as T);
          } catch (error) {
            logger.warn({ error }, "Failed to parse in-cluster Kubernetes API response");
            resolve(null);
          }
        });
      },
    );

    req.on("error", (error) => {
      if (!warnedInClusterAccess) {
        warnedInClusterAccess = true;
        logger.warn({ error }, "In-cluster Kubernetes API is not reachable");
      }
      resolve(null);
    });

    req.setTimeout(8000, () => {
      req.destroy(new Error("Kubernetes API request timeout"));
    });

    req.end();
  });
}

async function runKubectl(args: string[]): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("kubectl", args, { timeout: 10000 });
    return stdout;
  } catch (error) {
    if (!warnedKubectlAccess) {
      warnedKubectlAccess = true;
      logger.warn({ error, args }, "kubectl fallback is not available");
    }
    return null;
  }
}

async function kubectlListJson<T>(args: string[]): Promise<T[] | null> {
  const stdout = await runKubectl(args);
  if (!stdout) {
    return null;
  }

  try {
    const parsed = JSON.parse(stdout) as K8sListResponse<T>;
    return parsed.items ?? [];
  } catch (error) {
    logger.warn({ error }, "Failed to parse kubectl JSON output");
    return null;
  }
}

export function parseCpuToMillicores(value?: string): number {
  if (!value) return 0;
  const trimmed = value.trim();

  if (trimmed.endsWith("n")) {
    return Number.parseFloat(trimmed.slice(0, -1)) / 1_000_000;
  }
  if (trimmed.endsWith("u")) {
    return Number.parseFloat(trimmed.slice(0, -1)) / 1_000;
  }
  if (trimmed.endsWith("m")) {
    return Number.parseFloat(trimmed.slice(0, -1));
  }

  return Number.parseFloat(trimmed) * 1000;
}

export function parseMemoryToBytes(value?: string): number {
  if (!value) return 0;
  const trimmed = value.trim();

  const units: Record<string, number> = {
    Ki: 1024,
    Mi: 1024 ** 2,
    Gi: 1024 ** 3,
    Ti: 1024 ** 4,
    K: 1000,
    M: 1000 ** 2,
    G: 1000 ** 3,
    T: 1000 ** 4,
  };

  const match = trimmed.match(/^([0-9]+(?:\.[0-9]+)?)([a-zA-Z]+)?$/);
  if (!match) return 0;

  const amount = Number.parseFloat(match[1]);
  const unit = match[2];
  if (!unit) return amount;

  return amount * (units[unit] ?? 1);
}

export function formatK8sAge(creationTimestamp?: string): string {
  if (!creationTimestamp) return "unknown";

  const diffMs = Date.now() - new Date(creationTimestamp).getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return "unknown";

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${totalSeconds}s`;
}

export async function listPods(namespace = getTargetNamespace()): Promise<K8sPod[]> {
  const inCluster = await getInClusterJson<K8sListResponse<K8sPod>>(
    `/api/v1/namespaces/${namespace}/pods`,
  );
  if (inCluster?.items) {
    return inCluster.items;
  }

  const fallback = await kubectlListJson<K8sPod>(["get", "pods", "-n", namespace, "-o", "json"]);
  return fallback ?? [];
}

export async function listPodMetrics(
  namespace = getTargetNamespace(),
): Promise<Map<string, { cpuMillicores: number; memoryBytes: number }>> {
  const result = new Map<string, { cpuMillicores: number; memoryBytes: number }>();

  const inCluster = await getInClusterJson<
    K8sListResponse<{ metadata?: K8sMetadata; containers?: Array<{ usage?: { cpu?: string; memory?: string } }> }>
  >(`/apis/metrics.k8s.io/v1beta1/namespaces/${namespace}/pods`);

  if (inCluster?.items) {
    for (const podMetric of inCluster.items) {
      const podName = podMetric.metadata?.name;
      if (!podName) continue;

      const totals = (podMetric.containers ?? []).reduce(
        (acc, container) => {
          acc.cpuMillicores += parseCpuToMillicores(container.usage?.cpu);
          acc.memoryBytes += parseMemoryToBytes(container.usage?.memory);
          return acc;
        },
        { cpuMillicores: 0, memoryBytes: 0 },
      );

      result.set(podName, totals);
    }

    return result;
  }

  const topOutput = await runKubectl(["top", "pods", "-n", namespace, "--no-headers"]);
  if (!topOutput) {
    return result;
  }

  for (const line of topOutput.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length < 3) continue;

    const [name, cpuRaw, memoryRaw] = parts;
    result.set(name, {
      cpuMillicores: parseCpuToMillicores(cpuRaw),
      memoryBytes: parseMemoryToBytes(memoryRaw),
    });
  }

  return result;
}

export async function listDeployments(namespace = getTargetNamespace()): Promise<K8sDeployment[]> {
  const inCluster = await getInClusterJson<K8sListResponse<K8sDeployment>>(
    `/apis/apps/v1/namespaces/${namespace}/deployments`,
  );
  if (inCluster?.items) {
    return inCluster.items;
  }

  const fallback = await kubectlListJson<K8sDeployment>([
    "get",
    "deployments",
    "-n",
    namespace,
    "-o",
    "json",
  ]);
  return fallback ?? [];
}

export async function listReplicaSets(namespace = getTargetNamespace()): Promise<K8sReplicaSet[]> {
  const inCluster = await getInClusterJson<K8sListResponse<K8sReplicaSet>>(
    `/apis/apps/v1/namespaces/${namespace}/replicasets`,
  );
  if (inCluster?.items) {
    return inCluster.items;
  }

  const fallback = await kubectlListJson<K8sReplicaSet>([
    "get",
    "replicasets",
    "-n",
    namespace,
    "-o",
    "json",
  ]);
  return fallback ?? [];
}

export async function listWarningEvents(namespace = getTargetNamespace()): Promise<K8sEvent[]> {
  const inCluster = await getInClusterJson<K8sListResponse<K8sEvent>>(
    `/api/v1/namespaces/${namespace}/events`,
  );
  const items = inCluster?.items;
  if (items) {
    return items.filter((event) => event.type?.toLowerCase() === "warning");
  }

  const fallback = await kubectlListJson<K8sEvent>(["get", "events", "-n", namespace, "-o", "json"]);
  return (fallback ?? []).filter((event) => event.type?.toLowerCase() === "warning");
}
