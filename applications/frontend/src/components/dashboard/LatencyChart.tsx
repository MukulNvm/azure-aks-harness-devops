import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import type { LatencyPercentiles } from "@/lib/prometheus";

interface LatencyChartProps {
  latencyPercentiles: LatencyPercentiles[];
  isLoading: boolean;
}

const tooltipStyle = {
  backgroundColor: 'hsl(260 30% 7%)',
  borderColor: 'hsl(260 25% 15%)',
  borderRadius: '10px',
  color: 'hsl(270 10% 92%)',
  boxShadow: '0 8px 32px hsl(260 40% 3.5% / 0.5)',
};

export default function LatencyChart({ latencyPercentiles, isLoading }: LatencyChartProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-6">
        <h3 className="text-sm font-semibold mb-1">Response Time (Latency)</h3>
        <Skeleton className="h-[280px] w-full rounded-md mt-4" />
      </div>
    );
  }

  const data = latencyPercentiles.map(p => ({
    name: p.route.replace("/api/", "/"),
    p50: p.p50,
    p95: p.p95,
    p99: p.p99,
  }));

  return (
    <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold">Response Time (Latency)</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Percentile latencies per route (ms) — p50, p95, p99</p>
      </div>
      {data.length === 0 ? (
        <div className="h-[280px] flex items-center justify-center text-muted-foreground border border-dashed border-border/40 rounded-lg">
          No latency data available
        </div>
      ) : (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 0, right: 0, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 25% 12%)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: 'hsl(260 10% 55%)' }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(260 25% 12%)' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(260 10% 55%)' }}
                tickLine={false}
                axisLine={false}
                label={{ value: 'ms', angle: -90, position: 'insideLeft', style: { fill: 'hsl(260 10% 55%)', fontSize: 11 } }}
              />
              <RechartsTooltip
                contentStyle={tooltipStyle}
                itemStyle={{ color: 'hsl(270 10% 92%)' }}
                formatter={(value: number) => [`${value.toFixed(1)} ms`]}
                cursor={{ fill: 'hsl(260 25% 12% / 0.5)' }}
              />
              <Legend
                verticalAlign="bottom"
                height={24}
                formatter={(value) => <span style={{ color: 'hsl(260 10% 55%)', fontSize: '12px' }}>{value}</span>}
              />
              <Bar dataKey="p50" fill="hsl(233 67% 69%)" radius={[3, 3, 0, 0]} name="p50" />
              <Bar dataKey="p95" fill="hsl(262 60% 55%)" radius={[3, 3, 0, 0]} name="p95" />
              <Bar dataKey="p99" fill="hsl(15 85% 55%)" radius={[3, 3, 0, 0]} name="p99" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
