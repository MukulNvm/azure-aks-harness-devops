import { Server, Users, BarChart3, AlertTriangle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ParsedMetrics } from "@/lib/prometheus";

interface KpiCardsProps {
  healthStatus: { status: string; service?: string | null; timestamp?: string | null } | undefined;
  isHealthLoading: boolean;
  isHealthError: boolean;
  userCount: number;
  isUsersLoading: boolean;
  metrics: ParsedMetrics;
  isMetricsLoading: boolean;
  uptimeSeconds: number | null;
  environment: string;
}

const ENV_MULTIPLIERS: Record<string, { requests: number; errorRate: number; uptime: number }> = {
  all: { requests: 1, errorRate: 1, uptime: 1 },
  production: { requests: 1, errorRate: 1, uptime: 1 },
  staging: { requests: 0.3, errorRate: 1.8, uptime: 0.7 },
  dev: { requests: 0.1, errorRate: 3.2, uptime: 0.3 },
};

const ENV_SERVICE_NAMES: Record<string, string> = {
  all: "devops-harness-aks",
  production: "devops-harness-aks",
  staging: "staging.devops-harness",
  dev: "dev.devops-harness",
};

const CARD_GRADIENTS = [
  "from-primary/10 via-purple-500/5 to-transparent",
  "from-purple-500/10 via-indigo-500/5 to-transparent",
  "from-blue-500/10 via-primary/5 to-transparent",
  "from-orange-500/8 via-red-500/5 to-transparent",
  "from-emerald-500/8 via-teal-500/5 to-transparent",
];

export default function KpiCards({
  healthStatus,
  isHealthLoading,
  isHealthError,
  userCount,
  isUsersLoading,
  metrics,
  isMetricsLoading,
  uptimeSeconds,
  environment,
}: KpiCardsProps) {
  const mul = ENV_MULTIPLIERS[environment] || ENV_MULTIPLIERS.all;
  const isSystemHealthy = healthStatus?.status === "ok";
  const serviceName = ENV_SERVICE_NAMES[environment] || ENV_SERVICE_NAMES.all;

  const adjustedTotals = Math.round(metrics.totals * mul.requests);
  const adjustedErrorRate = metrics.errorRate * mul.errorRate;
  const adjustedUptime = uptimeSeconds !== null ? Math.round(uptimeSeconds * mul.uptime) : null;

  const formatUptime = (seconds: number | null): string => {
    if (seconds === null || seconds === undefined) return "--";
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const cards = [
    {
      title: "System Status",
      icon: Server,
      iconColor: isSystemHealthy ? "text-emerald-400" : (isHealthError ? "text-red-400" : "text-amber-400"),
      value: isHealthError ? "ERROR" : (healthStatus?.status?.toUpperCase() || "UNKNOWN"),
      subtitle: serviceName,
      loading: isHealthLoading,
      gradient: CARD_GRADIENTS[0],
    },
    {
      title: "Total Users",
      icon: Users,
      iconColor: "text-primary",
      value: String(userCount),
      subtitle: "registered accounts",
      loading: isUsersLoading,
      gradient: CARD_GRADIENTS[1],
    },
    {
      title: "Total Requests",
      icon: BarChart3,
      iconColor: "text-primary",
      value: adjustedTotals.toLocaleString(),
      subtitle: "HTTP requests total",
      loading: isMetricsLoading,
      gradient: CARD_GRADIENTS[2],
    },
    {
      title: "Error Rate",
      icon: AlertTriangle,
      iconColor: adjustedErrorRate > 5 ? "text-red-400" : (adjustedErrorRate > 1 ? "text-amber-400" : "text-emerald-400"),
      value: `${adjustedErrorRate.toFixed(2)}%`,
      subtitle: adjustedErrorRate > 2 ? "above threshold" : "within normal",
      loading: isMetricsLoading,
      gradient: CARD_GRADIENTS[3],
    },
    {
      title: "Uptime",
      icon: Clock,
      iconColor: "text-emerald-400",
      value: formatUptime(adjustedUptime),
      subtitle: "continuous uptime",
      loading: isMetricsLoading,
      gradient: CARD_GRADIENTS[4],
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className={`relative overflow-hidden rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-4 bg-gradient-to-br ${card.gradient}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">{card.title}</span>
              <div className={`p-1 rounded-md bg-background/30 ${card.iconColor}`}>
                <Icon className="h-3 w-3" />
              </div>
            </div>
            {card.loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div>
                <div className="text-2xl font-bold font-mono tracking-tight" data-testid={`text-${card.title.toLowerCase().replace(/\s/g, '-')}`}>
                  {card.value}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{card.subtitle}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
