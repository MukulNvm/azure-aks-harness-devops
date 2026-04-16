import { Box, Cpu, HardDrive, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

interface Pod {
  name: string;
  status: string;
  restarts: number;
  cpuPercent: number;
  memoryMb: number;
  node: string;
  age: string;
  namespace: string;
  environment?: string;
}

interface PodHealthProps {
  pods: Pod[] | undefined;
  isLoading: boolean;
  environmentFilter?: string;
}

const STATUS_STYLES: Record<string, string> = {
  Running: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  CrashLoopBackOff: "bg-red-500/10 text-red-400 border-red-500/20",
  Error: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function PodHealth({ pods, isLoading, environmentFilter }: PodHealthProps) {
  const filtered = pods?.filter(p =>
    !environmentFilter || environmentFilter === "all" ? true : p.environment === environmentFilter
  );
  const totalRestarts = filtered?.reduce((s, p) => s + p.restarts, 0) || 0;
  const namespaceLabel = filtered?.[0]?.namespace || pods?.[0]?.namespace || "unknown";

  return (
    <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Box className="h-4 w-4 text-primary" />
            Pod / Node Health
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">AKS cluster — ns: {namespaceLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs border-border/40">
            {filtered?.length || 0} pods
          </Badge>
          {totalRestarts > 0 && (
            <Badge variant="outline" className="font-mono text-xs bg-amber-500/10 text-amber-400 border-amber-500/20">
              <RotateCcw className="h-3 w-3 mr-1" />
              {totalRestarts} restart{totalRestarts > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </div>
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !filtered || filtered.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border/30 rounded-lg bg-muted/5">
          <Box className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm text-muted-foreground">No pods found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((pod) => (
            <div
              key={pod.name}
              className="p-3 rounded-lg border border-border/20 bg-muted/5 hover:bg-primary/5 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="font-mono text-xs font-medium text-foreground">{pod.name}</span>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Node: {pod.node.split("-").slice(-1)[0]} · Age: {pod.age}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {pod.restarts > 0 && (
                    <Badge variant="outline" className="text-[10px] h-5 bg-amber-500/10 text-amber-400 border-amber-500/20">
                      {pod.restarts} restart{pod.restarts > 1 ? "s" : ""}
                    </Badge>
                  )}
                  <Badge variant="outline" className={`text-[10px] h-5 ${STATUS_STYLES[pod.status] || ""}`}>
                    {pod.status}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                    <span className="flex items-center gap-1"><Cpu className="h-3 w-3" /> CPU</span>
                    <span className="font-mono">{pod.cpuPercent}%</span>
                  </div>
                  <Progress value={pod.cpuPercent} className="h-1.5" />
                </div>
                <div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                    <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" /> Memory</span>
                    <span className="font-mono">{pod.memoryMb} MB</span>
                  </div>
                  <Progress value={Math.min(pod.memoryMb / 512 * 100, 100)} className="h-1.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
