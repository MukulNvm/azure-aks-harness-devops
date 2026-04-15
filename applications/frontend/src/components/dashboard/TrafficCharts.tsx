import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import type { ParsedMetrics } from "@/lib/prometheus";

const STATUS_COLORS: Record<string, string> = {
  "200": "hsl(233 67% 69%)",
  "201": "hsl(262 60% 55%)",
  "400": "hsl(38 80% 55%)",
  "401": "hsl(38 80% 55%)",
  "403": "hsl(38 80% 55%)",
  "404": "hsl(15 85% 55%)",
  "500": "hsl(0 72% 55%)",
  "502": "hsl(0 72% 55%)",
  "503": "hsl(0 72% 55%)",
};

const tooltipStyle = {
  backgroundColor: 'hsl(260 30% 7%)',
  borderColor: 'hsl(260 25% 15%)',
  borderRadius: '10px',
  color: 'hsl(270 10% 92%)',
  boxShadow: '0 8px 32px hsl(260 40% 3.5% / 0.5)',
};

interface TrafficChartsProps {
  metrics: ParsedMetrics;
  isLoading: boolean;
}

export default function TrafficCharts({ metrics, isLoading }: TrafficChartsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-6">
          <h3 className="text-sm font-semibold mb-1">Requests by Route</h3>
          <Skeleton className="h-[320px] w-full rounded-md mt-4" />
        </div>
        <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-6">
          <h3 className="text-sm font-semibold mb-1">Status Code Distribution</h3>
          <Skeleton className="h-[320px] w-full rounded-md mt-4" />
        </div>
      </div>
    );
  }

  if (metrics.totals === 0) {
    return (
      <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-6">
        <h3 className="text-sm font-semibold mb-4">Traffic Analysis</h3>
        <div className="h-[200px] flex items-center justify-center text-muted-foreground border border-dashed border-border/40 rounded-lg">
          No metrics data available
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-6">
        <div className="mb-4">
          <h3 className="text-sm font-semibold">Requests by Route</h3>
          <p className="text-xs text-muted-foreground mt-0.5">HTTP request volume per API route</p>
        </div>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metrics.requestsByRoute} margin={{ top: 0, right: 0, bottom: 20, left: 0 }}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(233 67% 69%)" stopOpacity={1} />
                  <stop offset="100%" stopColor="hsl(262 60% 55%)" stopOpacity={0.8} />
                </linearGradient>
              </defs>
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
              />
              <RechartsTooltip
                contentStyle={tooltipStyle}
                itemStyle={{ color: 'hsl(270 10% 92%)' }}
                cursor={{ fill: 'hsl(260 25% 12% / 0.5)' }}
              />
              <Bar dataKey="total" fill="url(#barGradient)" radius={[6, 6, 0, 0]} name="Requests" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-6">
        <div className="mb-4">
          <h3 className="text-sm font-semibold">Status Code Distribution</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Breakdown of HTTP response status codes</p>
        </div>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={metrics.requestsByStatusCode}
                cx="50%"
                cy="45%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={4}
                dataKey="total"
                nameKey="name"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                labelLine={{ stroke: 'hsl(260 10% 55%)' }}
              >
                {metrics.requestsByStatusCode.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={STATUS_COLORS[entry.name] || "hsl(260 10% 55%)"}
                    stroke="hsl(260 40% 3.5%)"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <RechartsTooltip
                contentStyle={tooltipStyle}
                itemStyle={{ color: 'hsl(270 10% 92%)' }}
                formatter={(value: number, name: string) => [`${value.toLocaleString()} requests`, `Status ${name}`]}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => <span style={{ color: 'hsl(260 10% 55%)', fontSize: '12px' }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
