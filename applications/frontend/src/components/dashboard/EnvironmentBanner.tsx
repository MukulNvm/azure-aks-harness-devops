import { Server, Code, TestTube, X, Shield, AlertTriangle, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface EnvironmentBannerProps {
  environment: string;
  onReset: () => void;
}

const ENV_CONFIG: Record<string, {
  label: string;
  icon: typeof Server;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  statusIcon: typeof Shield;
  statusText: string;
}> = {
  production: {
    label: "Production",
    icon: Server,
    color: "text-red-400",
    bgColor: "bg-red-500/5",
    borderColor: "border-red-500/10",
    description: "Live environment — devops-harness-aks.eastus2.azure.com",
    statusIcon: Shield,
    statusText: "Protected",
  },
  staging: {
    label: "Staging",
    icon: TestTube,
    color: "text-amber-400",
    bgColor: "bg-amber-500/5",
    borderColor: "border-amber-500/10",
    description: "Pre-production validation — staging.devops-harness-aks.internal",
    statusIcon: AlertTriangle,
    statusText: "Testing",
  },
  dev: {
    label: "Development",
    icon: Code,
    color: "text-blue-400",
    bgColor: "bg-blue-500/5",
    borderColor: "border-blue-500/10",
    description: "Development sandbox — dev.devops-harness-aks.internal",
    statusIcon: Zap,
    statusText: "Unstable",
  },
};

export default function EnvironmentBanner({ environment, onReset }: EnvironmentBannerProps) {
  if (environment === "all") return null;

  const config = ENV_CONFIG[environment];
  if (!config) return null;

  const Icon = config.icon;
  const StatusIcon = config.statusIcon;

  return (
    <div className={`${config.bgColor} border-b ${config.borderColor} px-4 py-2`}>
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className={`h-4 w-4 ${config.color}`} />
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${config.color}`}>
              {config.label} Environment
            </span>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              — {config.description}
            </span>
          </div>
          <Badge variant="outline" className={`text-[10px] h-5 ${config.color} border-current/20 gap-1`}>
            <StatusIcon className="h-3 w-3" />
            {config.statusText}
          </Badge>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-transparent" onClick={onReset}>
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}
