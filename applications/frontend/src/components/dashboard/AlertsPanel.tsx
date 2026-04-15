import { useState } from "react";
import { Bell, AlertTriangle, Settings2, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { ParsedMetrics } from "@/lib/prometheus";

interface AlertConfig {
  errorRateWarning: number;
  errorRateCritical: number;
  latencyP95Warning: number;
  latencyP95Critical: number;
  podRestartWarning: number;
  podRestartCritical: number;
}

interface AlertsPanelProps {
  metrics: ParsedMetrics;
  alertConfig: AlertConfig | undefined;
  isAlertConfigLoading: boolean;
  onUpdateConfig: (config: AlertConfig) => void;
  podRestarts?: number;
}

interface AlertItem {
  id: string;
  label: string;
  value: number;
  unit: string;
  warning: number;
  critical: number;
  status: "ok" | "warning" | "critical";
}

export default function AlertsPanel({
  metrics,
  alertConfig,
  isAlertConfigLoading,
  onUpdateConfig,
  podRestarts = 1,
}: AlertsPanelProps) {
  const [configOpen, setConfigOpen] = useState(false);
  const [editConfig, setEditConfig] = useState<AlertConfig | null>(null);

  const cfg = alertConfig || {
    errorRateWarning: 2,
    errorRateCritical: 5,
    latencyP95Warning: 200,
    latencyP95Critical: 500,
    podRestartWarning: 3,
    podRestartCritical: 10,
  };

  const avgP95 = metrics.latencyPercentiles.length > 0
    ? metrics.latencyPercentiles.reduce((s, p) => s + p.p95, 0) / metrics.latencyPercentiles.length
    : 0;

  const alerts: AlertItem[] = [
    {
      id: "error-rate",
      label: "Error Rate",
      value: metrics.errorRate,
      unit: "%",
      warning: cfg.errorRateWarning,
      critical: cfg.errorRateCritical,
      status: metrics.errorRate >= cfg.errorRateCritical ? "critical" : metrics.errorRate >= cfg.errorRateWarning ? "warning" : "ok",
    },
    {
      id: "latency-p95",
      label: "Latency (p95 avg)",
      value: avgP95,
      unit: "ms",
      warning: cfg.latencyP95Warning,
      critical: cfg.latencyP95Critical,
      status: avgP95 >= cfg.latencyP95Critical ? "critical" : avgP95 >= cfg.latencyP95Warning ? "warning" : "ok",
    },
    {
      id: "pod-restarts",
      label: "Pod Restarts",
      value: podRestarts,
      unit: "",
      warning: cfg.podRestartWarning,
      critical: cfg.podRestartCritical,
      status: podRestarts >= cfg.podRestartCritical ? "critical" : podRestarts >= cfg.podRestartWarning ? "warning" : "ok",
    },
  ];

  const activeAlerts = alerts.filter(a => a.status !== "ok");
  const criticalCount = alerts.filter(a => a.status === "critical").length;

  const statusColors = {
    ok: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    critical: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  const handleSaveConfig = () => {
    if (editConfig) {
      onUpdateConfig(editConfig);
      setConfigOpen(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Bell className={`h-4 w-4 ${criticalCount > 0 ? "text-red-400 animate-pulse" : activeAlerts.length > 0 ? "text-amber-400" : "text-emerald-400"}`} />
            Alerts & Thresholds
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeAlerts.length === 0 ? "All systems within normal thresholds" : `${activeAlerts.length} active alert${activeAlerts.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <Dialog open={configOpen} onOpenChange={(open) => {
          setConfigOpen(open);
          if (open) setEditConfig({ ...cfg });
        }}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10">
              <Settings2 className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Alert Thresholds</DialogTitle>
              <DialogDescription>Configure warning and critical thresholds for alerts.</DialogDescription>
            </DialogHeader>
            {editConfig && (
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Error Rate (%)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Warning</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={editConfig.errorRateWarning}
                        onChange={(e) => setEditConfig({ ...editConfig, errorRateWarning: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Critical</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={editConfig.errorRateCritical}
                        onChange={(e) => setEditConfig({ ...editConfig, errorRateCritical: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Latency P95 (ms)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Warning</Label>
                      <Input
                        type="number"
                        value={editConfig.latencyP95Warning}
                        onChange={(e) => setEditConfig({ ...editConfig, latencyP95Warning: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Critical</Label>
                      <Input
                        type="number"
                        value={editConfig.latencyP95Critical}
                        onChange={(e) => setEditConfig({ ...editConfig, latencyP95Critical: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Pod Restarts</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Warning</Label>
                      <Input
                        type="number"
                        value={editConfig.podRestartWarning}
                        onChange={(e) => setEditConfig({ ...editConfig, podRestartWarning: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Critical</Label>
                      <Input
                        type="number"
                        value={editConfig.podRestartCritical}
                        onChange={(e) => setEditConfig({ ...editConfig, podRestartCritical: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={handleSaveConfig} className="gap-2">
                <Check className="h-4 w-4" />
                Save Thresholds
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {isAlertConfigLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <div className="space-y-2.5">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                alert.status === "critical"
                  ? "border-red-500/20 bg-red-500/5"
                  : alert.status === "warning"
                  ? "border-amber-500/20 bg-amber-500/5"
                  : "border-border/30 bg-muted/10"
              }`}
            >
              <div className="flex items-center gap-3">
                {alert.status !== "ok" && (
                  <AlertTriangle className={`h-4 w-4 ${alert.status === "critical" ? "text-red-400" : "text-amber-400"}`} />
                )}
                <div>
                  <span className="text-sm font-medium">{alert.label}</span>
                  <div className="text-[11px] text-muted-foreground">
                    Warn: {alert.warning}{alert.unit} / Crit: {alert.critical}{alert.unit}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-bold">
                  {alert.value.toFixed(alert.unit === "%" ? 2 : 1)}{alert.unit}
                </span>
                <Badge variant="outline" className={statusColors[alert.status]}>
                  {alert.status.toUpperCase()}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
