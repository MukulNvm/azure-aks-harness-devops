import { formatDistanceToNow } from "date-fns";
import { Rocket, GitCommit, Clock, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Deployment {
  id: string;
  version: string;
  timestamp: string;
  status: string;
  environment: string;
  pipeline: string;
  commitHash?: string;
  author?: string;
  duration?: number;
}

interface DeploymentHistoryProps {
  deployments: Deployment[] | undefined;
  isLoading: boolean;
  environmentFilter: string;
}

const STATUS_STYLES: Record<string, string> = {
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  failed: "bg-red-500/10 text-red-400 border-red-500/20",
  rolled_back: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  in_progress: "bg-primary/10 text-primary border-primary/20",
};

const ENV_STYLES: Record<string, string> = {
  production: "bg-red-500/10 text-red-400 border-red-500/20",
  staging: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  dev: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

export default function DeploymentHistory({ deployments, isLoading, environmentFilter }: DeploymentHistoryProps) {
  const filtered = deployments?.filter(
    d => environmentFilter === "all" || d.environment === environmentFilter
  );

  return (
    <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" />
            Deployment History
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Recent CI/CD pipeline deployments</p>
        </div>
        <Badge variant="outline" className="font-mono text-xs border-border/40">
          {filtered?.length || 0} deploys
        </Badge>
      </div>
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !filtered || filtered.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border/30 rounded-lg bg-muted/5">
          <Rocket className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm text-muted-foreground">No deployments for this environment</p>
        </div>
      ) : (
        <ScrollArea className="h-[340px]">
          <div className="space-y-2 pr-3">
            {filtered.map((dep) => (
              <div
                key={dep.id}
                className="p-3 rounded-lg border border-border/20 bg-muted/5 hover:bg-primary/5 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm">{dep.version}</span>
                    <Badge variant="outline" className={STATUS_STYLES[dep.status] || ""}>
                      {dep.status.replace("_", " ")}
                    </Badge>
                    <Badge variant="outline" className={ENV_STYLES[dep.environment] || ""}>
                      {dep.environment}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(dep.timestamp), { addSuffix: true })}
                  </span>
                  {dep.commitHash && (
                    <span className="flex items-center gap-1">
                      <GitCommit className="h-3 w-3" />
                      <span className="font-mono">{dep.commitHash}</span>
                    </span>
                  )}
                  {dep.author && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {dep.author}
                    </span>
                  )}
                  {dep.duration && (
                    <span className="font-mono">{dep.duration}s</span>
                  )}
                  <span className="text-[10px] font-mono opacity-60">{dep.pipeline}</span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
