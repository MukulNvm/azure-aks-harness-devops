import { useEffect, useRef } from "react";
import { format } from "date-fns";
import { Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RequestLog {
  id: string;
  timestamp: string;
  method: string;
  route: string;
  statusCode: number;
  latencyMs: number;
  userAgent?: string;
}

interface LiveRequestLogProps {
  logs: RequestLog[] | undefined;
  isLoading: boolean;
}

const METHOD_COLORS: Record<string, string> = {
  GET: "text-primary",
  POST: "text-purple-400",
  PATCH: "text-amber-400",
  PUT: "text-amber-400",
  DELETE: "text-red-400",
};

const STATUS_COLORS: Record<string, string> = {
  "2": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "3": "bg-primary/10 text-primary border-primary/20",
  "4": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "5": "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function LiveRequestLog({ logs, isLoading }: LiveRequestLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (el) {
        el.scrollTop = 0;
      }
    }
  }, [logs]);

  return (
    <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
            Live Request Log
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Real-time incoming API requests</p>
        </div>
        <Badge variant="outline" className="font-mono text-xs border-border/40">
          {logs?.length || 0} entries
        </Badge>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : (
        <div ref={scrollRef}>
          <ScrollArea className="h-[360px]">
            <div className="space-y-0.5 pr-3">
              <div className="grid grid-cols-[60px_50px_1fr_55px_65px] gap-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider pb-2 border-b border-border/30 sticky top-0 bg-card/90 backdrop-blur-sm z-10">
                <span>Time</span>
                <span>Method</span>
                <span>Route</span>
                <span className="text-right">Status</span>
                <span className="text-right">Latency</span>
              </div>
              {logs?.map((log) => {
                const statusCategory = String(log.statusCode)[0];
                return (
                  <div
                    key={log.id}
                    className="grid grid-cols-[60px_50px_1fr_55px_65px] gap-2 items-center text-xs py-1.5 border-b border-border/10 hover:bg-primary/5 transition-colors rounded"
                  >
                    <span className="font-mono text-muted-foreground">
                      {format(new Date(log.timestamp), "HH:mm:ss")}
                    </span>
                    <span className={`font-mono font-bold ${METHOD_COLORS[log.method] || "text-foreground"}`}>
                      {log.method}
                    </span>
                    <span className="font-mono truncate text-foreground/80">
                      {log.route}
                    </span>
                    <span className="text-right">
                      <Badge variant="outline" className={`text-[10px] h-5 px-1.5 font-mono ${STATUS_COLORS[statusCategory] || ""}`}>
                        {log.statusCode}
                      </Badge>
                    </span>
                    <span className={`font-mono text-right ${log.latencyMs > 100 ? "text-amber-400" : log.latencyMs > 200 ? "text-red-400" : "text-muted-foreground"}`}>
                      {log.latencyMs.toFixed(1)}ms
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
