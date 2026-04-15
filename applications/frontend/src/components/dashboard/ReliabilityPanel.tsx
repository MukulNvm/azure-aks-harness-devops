import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface ReliabilityPanelProps {
  healthStatus: { status: string; service?: string | null; timestamp?: string | null } | undefined;
  isHealthLoading: boolean;
  isHealthError: boolean;
  metricsAvailable: boolean;
  isMetricsLoading: boolean;
  onRetryHealth: () => void;
}

function StatusBadge({ label, isLoading, isOnline, onlineText, offlineText }: {
  label: string;
  isLoading: boolean;
  isOnline: boolean;
  onlineText: string;
  offlineText: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      {isLoading ? (
        <Skeleton className="h-5 w-16 rounded-full" />
      ) : (
        <Badge
          variant="outline"
          className={
            isOnline
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-red-500/10 text-red-400 border-red-500/20"
          }
        >
          {isOnline ? onlineText : offlineText}
        </Badge>
      )}
    </div>
  );
}

export default function ReliabilityPanel({
  healthStatus,
  isHealthLoading,
  isHealthError,
  metricsAvailable,
  isMetricsLoading,
  onRetryHealth,
}: ReliabilityPanelProps) {
  const isSystemHealthy = healthStatus?.status === "ok";

  return (
    <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
      <div className="p-6">
        <div className="mb-4">
          <h3 className="text-sm font-semibold">Reliability Panel</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Service health and recovery actions</p>
        </div>
        <div className="space-y-3">
          <StatusBadge
            label="API Backend"
            isLoading={isHealthLoading}
            isOnline={isSystemHealthy}
            onlineText="ONLINE"
            offlineText="OFFLINE"
          />
          <StatusBadge
            label="Database"
            isLoading={isHealthLoading}
            isOnline={isSystemHealthy}
            onlineText="CONNECTED"
            offlineText="DISCONNECTED"
          />
          <StatusBadge
            label="Metrics Engine"
            isLoading={isMetricsLoading}
            isOnline={metricsAvailable}
            onlineText="ACTIVE"
            offlineText="DEGRADED"
          />
        </div>

        {!isSystemHealthy && !isHealthLoading && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span className="text-sm font-semibold text-red-400">Incident Detected</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Health check failed. The primary API backend may be unresponsive.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-red-500/20 hover:bg-red-500/10 hover:text-red-400"
              onClick={onRetryHealth}
              data-testid="button-retry-health"
            >
              Attempt Recovery
            </Button>
          </div>
        )}
      </div>
      <div className="border-t border-border/30 bg-muted/5 px-6 py-3 text-xs text-muted-foreground space-y-1">
        <div className="flex justify-between">
          <span>Auto-refresh:</span>
          <span className="font-mono text-foreground/80">15s</span>
        </div>
        {healthStatus?.timestamp && (
          <div className="flex justify-between">
            <span>Last Ping:</span>
            <span className="font-mono text-foreground/80">{new Date(healthStatus.timestamp).toLocaleTimeString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
