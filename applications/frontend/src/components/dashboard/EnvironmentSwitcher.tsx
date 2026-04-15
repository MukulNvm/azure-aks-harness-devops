import { Cloud, Server, Code, TestTube } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EnvironmentSwitcherProps {
  value: string;
  onChange: (value: string) => void;
}

const ENVIRONMENTS = [
  { value: "all", label: "All", icon: Cloud },
  { value: "production", label: "Production", icon: Server },
  { value: "staging", label: "Staging", icon: TestTube },
  { value: "dev", label: "Dev", icon: Code },
];

export default function EnvironmentSwitcher({ value, onChange }: EnvironmentSwitcherProps) {
  return (
    <Tabs value={value} onValueChange={onChange}>
      <TabsList className="bg-muted/30 h-8 border border-border/30">
        {ENVIRONMENTS.map((env) => {
          const Icon = env.icon;
          return (
            <TabsTrigger
              key={env.value}
              value={env.value}
              className="text-xs gap-1.5 px-3 h-7 data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-md"
            >
              <Icon className="h-3 w-3" />
              {env.label}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
