import { useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import type { ParsedMetrics } from "@/lib/prometheus";

interface AlertConfig {
  errorRateWarning: number;
  errorRateCritical: number;
  latencyP95Warning: number;
  latencyP95Critical: number;
  podRestartWarning: number;
  podRestartCritical: number;
}

export function useNotifications(
  metrics: ParsedMetrics,
  alertConfig: AlertConfig | undefined,
  isHealthError: boolean,
  podRestarts: number = 0,
) {
  const { toast } = useToast();
  const lastHealthError = useRef(false);
  const lastAlertState = useRef<Record<string, string>>({});

  const checkAlerts = useCallback(() => {
    if (!alertConfig) return;

    if (isHealthError && !lastHealthError.current) {
      toast({
        variant: "destructive",
        title: "Health Check Failed",
        description: "The API backend is not responding. Check the reliability panel for details.",
      });
    }
    lastHealthError.current = isHealthError;

    const currentState: Record<string, string> = {};

    if (metrics.errorRate >= alertConfig.errorRateCritical) {
      currentState["error-rate"] = "critical";
    } else if (metrics.errorRate >= alertConfig.errorRateWarning) {
      currentState["error-rate"] = "warning";
    }

    const avgP95 = metrics.latencyPercentiles.length > 0
      ? metrics.latencyPercentiles.reduce((s, p) => s + p.p95, 0) / metrics.latencyPercentiles.length
      : 0;

    if (avgP95 >= alertConfig.latencyP95Critical) {
      currentState["latency"] = "critical";
    } else if (avgP95 >= alertConfig.latencyP95Warning) {
      currentState["latency"] = "warning";
    }

    if (podRestarts >= alertConfig.podRestartCritical) {
      currentState["pod-restarts"] = "critical";
    } else if (podRestarts >= alertConfig.podRestartWarning) {
      currentState["pod-restarts"] = "warning";
    }

    const labels: Record<string, string> = {
      "error-rate": "Error Rate",
      "latency": "Latency P95",
      "pod-restarts": "Pod Restarts",
    };

    for (const [key, level] of Object.entries(currentState)) {
      if (lastAlertState.current[key] !== level) {
        let description = "";
        if (key === "error-rate") {
          description = `Error rate is ${metrics.errorRate.toFixed(2)}% (threshold: ${level === "critical" ? alertConfig.errorRateCritical : alertConfig.errorRateWarning}%)`;
        } else if (key === "latency") {
          description = `Average P95 latency is ${avgP95.toFixed(1)}ms (threshold: ${level === "critical" ? alertConfig.latencyP95Critical : alertConfig.latencyP95Warning}ms)`;
        } else if (key === "pod-restarts") {
          description = `Pod restarts: ${podRestarts} (threshold: ${level === "critical" ? alertConfig.podRestartCritical : alertConfig.podRestartWarning})`;
        }
        toast({
          variant: level === "critical" ? "destructive" : "default",
          title: `${level === "critical" ? "CRITICAL" : "WARNING"}: ${labels[key] || key}`,
          description,
        });
      }
    }

    lastAlertState.current = currentState;
  }, [metrics, alertConfig, isHealthError, podRestarts, toast]);

  useEffect(() => {
    checkAlerts();
  }, [checkAlerts]);
}
