import { formatDistanceToNow } from "date-fns";
import { AlertCircle, CheckCircle2, Clock, Search as SearchIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Incident {
  id: string;
  title: string;
  severity: string;
  status: string;
  environment?: string;
  startedAt: string;
  resolvedAt?: string | null;
  durationMinutes?: number | null;
  rootCause?: string | null;
}

interface IncidentTimelineProps {
  incidents: Incident[] | undefined;
  isLoading: boolean;
  environmentFilter?: string;
}

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  info: "bg-primary/10 text-primary border-primary/20",
};

const STATUS_ICONS: Record<string, typeof AlertCircle> = {
  investigating: SearchIcon,
  resolved: CheckCircle2,
};

export default function IncidentTimeline({ incidents, isLoading, environmentFilter }: IncidentTimelineProps) {
  const filtered = incidents?.filter(i =>
    !environmentFilter || environmentFilter === "all" ? true : i.environment === environmentFilter
  );
  const activeCount = filtered?.filter(i => i.status !== "resolved").length || 0;

  return (
    <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <AlertCircle className={`h-4 w-4 ${activeCount > 0 ? "text-amber-400" : "text-emerald-400"}`} />
          Incident Timeline
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {activeCount > 0 ? `${activeCount} active incident${activeCount > 1 ? "s" : ""}` : "No active incidents"}
        </p>
      </div>
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : !filtered || filtered.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border/30 rounded-lg bg-muted/5">
          <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2 opacity-70" />
          <p className="text-sm text-muted-foreground">No incidents recorded</p>
        </div>
      ) : (
        <ScrollArea className="h-[340px]">
          <div className="relative pr-3">
            <div className="absolute left-3 top-2 bottom-2 w-px bg-border/30" />
            <div className="space-y-3 pl-8">
              {filtered.map((incident) => {
                const StatusIcon = STATUS_ICONS[incident.status] || AlertCircle;
                const isActive = incident.status !== "resolved";

                return (
                  <div key={incident.id} className="relative">
                    <div className={`absolute -left-8 top-3 w-5 h-5 rounded-full flex items-center justify-center border-2 ${
                      isActive ? "border-amber-400 bg-amber-500/20" : "border-border/40 bg-card"
                    }`}>
                      <StatusIcon className={`h-3 w-3 ${isActive ? "text-amber-400" : "text-muted-foreground"}`} />
                    </div>
                    <div className={`p-3 rounded-lg border ${
                      isActive ? "border-amber-500/20 bg-amber-500/5" : "border-border/20 bg-muted/5"
                    }`}>
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] text-muted-foreground">{incident.id}</span>
                          <Badge variant="outline" className={SEVERITY_STYLES[incident.severity] || ""}>
                            {incident.severity}
                          </Badge>
                          <Badge variant="outline" className={isActive ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}>
                            {incident.status}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm font-medium mb-1.5">{incident.title}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(incident.startedAt), { addSuffix: true })}
                        </span>
                        {incident.durationMinutes && (
                          <span className="font-mono">Duration: {incident.durationMinutes}m</span>
                        )}
                      </div>
                      {incident.rootCause && (
                        <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/20 italic">
                          Root cause: {incident.rootCause}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
