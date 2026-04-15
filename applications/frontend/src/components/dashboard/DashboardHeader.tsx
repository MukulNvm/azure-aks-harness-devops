import { format } from "date-fns";
import { Activity, RefreshCw, Sun, Moon, Maximize, Minimize, Download, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import EnvironmentSwitcher from "./EnvironmentSwitcher";

interface DashboardHeaderProps {
  lastRefresh: Date;
  onRefresh: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onExportUsers: () => void;
  onExportMetrics: () => void;
  environment: string;
  onEnvironmentChange: (env: string) => void;
}

export default function DashboardHeader({
  lastRefresh,
  onRefresh,
  isDark,
  onToggleTheme,
  isFullscreen,
  onToggleFullscreen,
  onExportUsers,
  onExportMetrics,
  environment,
  onEnvironmentChange,
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-border/30 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="bg-gradient-to-br from-primary/20 to-purple-500/20 p-2 rounded-lg">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight">DevOps Dashboard</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
              <Badge variant="outline" className={`h-4 px-1.5 rounded-sm text-[10px] ${
                environment === "production" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                environment === "staging" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                environment === "dev" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                "bg-primary/10 text-primary border-primary/20"
              }`}>
                {environment === "all" ? "ALL ENVS" : environment.toUpperCase()}
              </Badge>
              <span className="opacity-60">v2.4.1</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <EnvironmentSwitcher value={environment} onChange={onEnvironmentChange} />

          <div className="text-xs text-muted-foreground hidden lg:block ml-3 mr-1 font-mono tabular-nums">
            {format(lastRefresh, 'HH:mm:ss')}
          </div>

          <div className="flex items-center gap-0.5 ml-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onToggleTheme} className="h-7 w-7 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-foreground">
                  {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle theme (T)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onToggleFullscreen} className="h-7 w-7 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-foreground">
                  {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Fullscreen (F)</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-foreground">
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export Data</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onExportUsers}>Export Users (CSV)</DropdownMenuItem>
                <DropdownMenuItem onClick={onExportMetrics}>Export Metrics (CSV)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-foreground">
                  <Keyboard className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Keyboard Shortcuts</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="justify-between">
                  Refresh <kbd className="ml-2 text-xs font-mono bg-muted px-1.5 py-0.5 rounded">R</kbd>
                </DropdownMenuItem>
                <DropdownMenuItem className="justify-between">
                  Toggle Theme <kbd className="ml-2 text-xs font-mono bg-muted px-1.5 py-0.5 rounded">T</kbd>
                </DropdownMenuItem>
                <DropdownMenuItem className="justify-between">
                  Fullscreen <kbd className="ml-2 text-xs font-mono bg-muted px-1.5 py-0.5 rounded">F</kbd>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="gap-1.5 h-8 ml-2 rounded-lg border-primary/20 hover:bg-primary/10 hover:border-primary/40"
            data-testid="button-manual-refresh"
          >
            <RefreshCw className="h-3 w-3" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
