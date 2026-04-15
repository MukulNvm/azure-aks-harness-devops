import { format, formatDistanceToNow } from "date-fns";
import { User, Mail, Calendar, Clock, Activity } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface ActivityEntry {
  timestamp: string;
  action: string;
  detail: string;
}

interface UserDetailData {
  id: number;
  name: string;
  role: string;
  email: string;
  lastLogin?: string | null;
  createdAt: string;
  activityLog: ActivityEntry[];
}

interface UserDetailModalProps {
  user: UserDetailData | undefined;
  isLoading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLE_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  admin: "default",
  developer: "secondary",
  ops: "outline",
};

const ACTION_COLORS: Record<string, string> = {
  login: "text-blue-500",
  deploy: "text-emerald-500",
  config_change: "text-amber-500",
  pr_merge: "text-purple-500",
  incident_ack: "text-red-500",
  scale: "text-cyan-500",
  user_create: "text-emerald-500",
  account_created: "text-blue-500",
};

export default function UserDetailModal({ user, isLoading, open, onOpenChange }: UserDetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Details
          </DialogTitle>
          <DialogDescription>User profile and activity history</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : user ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-border/50 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{user.name}</h3>
                  <span className="text-xs text-muted-foreground font-mono">#{user.id}</span>
                </div>
                <Badge variant={ROLE_VARIANTS[user.role] || "secondary"}>
                  {user.role}
                </Badge>
              </div>
              <Separator />
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Created {format(new Date(user.createdAt), "MMM d, yyyy")}</span>
                </div>
                {user.lastLogin && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Last login {formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true })}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4" />
                Activity Log
              </h4>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2 pr-3">
                  {user.activityLog.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No activity recorded</p>
                  ) : (
                    user.activityLog.map((entry, i) => (
                      <div key={i} className="flex gap-3 text-sm p-2 rounded-md hover:bg-muted/30">
                        <span className="text-xs text-muted-foreground font-mono whitespace-nowrap mt-0.5">
                          {format(new Date(entry.timestamp), "HH:mm")}
                        </span>
                        <div>
                          <span className={`font-mono text-xs font-medium ${ACTION_COLORS[entry.action] || "text-foreground"}`}>
                            {entry.action}
                          </span>
                          <p className="text-xs text-muted-foreground mt-0.5">{entry.detail}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">User not found</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
