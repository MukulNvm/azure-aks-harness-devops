import { Router, type IRouter } from "express";
import { GetDeploymentsResponse } from "@workspace/api-zod";
import { logger } from "../lib/logger";
import {
  type K8sDeployment,
  type K8sReplicaSet,
  getTargetNamespace,
  listDeployments,
  listReplicaSets,
  namespaceToEnvironment,
} from "../lib/kubernetes";

const router: IRouter = Router();

function getContainerImage(resource: {
  spec?: {
    template?: {
      spec?: {
        containers?: Array<{ image?: string }>;
      };
    };
  };
}): string | undefined {
  return resource.spec?.template?.spec?.containers?.[0]?.image;
}

function getRevision(annotations?: Record<string, string>): number {
  const raw = annotations?.["deployment.kubernetes.io/revision"];
  const revision = Number.parseInt(raw ?? "", 10);
  return Number.isNaN(revision) ? 0 : revision;
}

function extractVersion(image?: string): string {
  if (!image) return "unknown";

  const digestMarker = "@sha256:";
  const digestIndex = image.indexOf(digestMarker);
  if (digestIndex >= 0) {
    const digest = image.slice(digestIndex + digestMarker.length, digestIndex + digestMarker.length + 8);
    return `sha-${digest || "unknown"}`;
  }

  const tagCandidate = image.split(":").pop();
  if (!tagCandidate || tagCandidate.includes("/")) {
    return "latest";
  }

  return tagCandidate;
}

function extractCommitHash(image?: string): string | undefined {
  if (!image || !image.includes("@sha256:")) return undefined;
  const digest = image.split("@sha256:")[1];
  if (!digest) return undefined;
  return digest.slice(0, 7);
}

function getReplicaSetStatus(replicaSet: K8sReplicaSet, currentRevision: number): string {
  const revision = getRevision(replicaSet.metadata?.annotations);
  const replicas = replicaSet.status?.replicas ?? 0;
  const availableReplicas = replicaSet.status?.availableReplicas ?? 0;

  if (revision === currentRevision && replicas > 0 && availableReplicas < replicas) {
    return "in_progress";
  }

  if (replicas > 0 && availableReplicas === 0) {
    return "failed";
  }

  return "success";
}

function getDeploymentStatus(deployment: K8sDeployment): string {
  const updated = deployment.status?.updatedReplicas ?? 0;
  const ready = deployment.status?.readyReplicas ?? 0;
  if (updated > 0 && ready < updated) {
    return "in_progress";
  }
  return "success";
}

router.get("/deployments", async (_req, res): Promise<void> => {
  const namespace = getTargetNamespace();
  const environment = namespaceToEnvironment(namespace);
  const pipelineName =
    process.env.CI_PIPELINE_NAME ??
    process.env.HARNESS_PIPELINE_NAME ??
    `aks-${namespace}`;

  try {
    const [deployments, replicaSets] = await Promise.all([
      listDeployments(namespace),
      listReplicaSets(namespace),
    ]);

    const rows: Array<{
      id: string;
      version: string;
      timestamp: string;
      status: string;
      environment: string;
      pipeline: string;
      commitHash?: string;
      author?: string;
      duration?: number;
    }> = [];

    for (const deployment of deployments) {
      const deploymentName = deployment.metadata?.name;
      if (!deploymentName) continue;

      const currentRevision = getRevision(deployment.metadata?.annotations);
      const linkedReplicaSets = replicaSets
        .filter((replicaSet) =>
          (replicaSet.metadata?.ownerReferences ?? []).some(
            (owner) => owner.kind === "Deployment" && owner.name === deploymentName,
          ),
        )
        .sort((a, b) => {
          const aTime = new Date(a.metadata?.creationTimestamp ?? 0).getTime();
          const bTime = new Date(b.metadata?.creationTimestamp ?? 0).getTime();
          return bTime - aTime;
        });

      if (linkedReplicaSets.length === 0) {
        const image = getContainerImage(deployment);
        rows.push({
          id: `${deploymentName}-current`,
          version: extractVersion(image),
          timestamp: deployment.metadata?.creationTimestamp ?? new Date().toISOString(),
          status: getDeploymentStatus(deployment),
          environment,
          pipeline: pipelineName,
          commitHash: extractCommitHash(image),
          author: process.env.CI_ACTOR ?? process.env.BUILD_TRIGGERED_BY,
        });
        continue;
      }

      for (const replicaSet of linkedReplicaSets) {
        const revision = getRevision(replicaSet.metadata?.annotations);
        const image = getContainerImage(replicaSet) ?? getContainerImage(deployment);
        const revisionSuffix = revision > 0 ? `rev-${revision}` : replicaSet.metadata?.uid?.slice(0, 8) ?? "unknown";

        rows.push({
          id: `${deploymentName}-${revisionSuffix}`,
          version: extractVersion(image),
          timestamp: replicaSet.metadata?.creationTimestamp ?? new Date().toISOString(),
          status: getReplicaSetStatus(replicaSet, currentRevision),
          environment,
          pipeline: pipelineName,
          commitHash: extractCommitHash(image),
          author: replicaSet.metadata?.annotations?.["harness.io/triggered-by"] ?? process.env.CI_ACTOR,
        });
      }
    }

    const response = GetDeploymentsResponse.parse(
      rows
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        )
        .slice(0, 100),
    );

    res.json(response);
  } catch (error) {
    logger.warn({ error, namespace }, "Failed to build deployment history from Kubernetes API");
    res.json([]);
  }
});

export default router;
