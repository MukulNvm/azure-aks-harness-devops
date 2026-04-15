import { useState, useMemo, useCallback } from "react";
import {
  useHealthCheck,
  getHealthCheckQueryKey,
  useListUsers,
  getListUsersQueryKey,
  useGetMetrics,
  getGetMetricsQueryKey,
  useGetRequestLogs,
  getGetRequestLogsQueryKey,
  useGetDeployments,
  useGetPods,
  useGetIncidents,
  useGetAlertConfig,
  getGetAlertConfigQueryKey,
  useUpdateAlertConfig,
  useGetUser,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { parsePrometheusMetrics } from "@/lib/prometheus";
import { exportUsersCsv, exportMetricsCsv } from "@/lib/export-csv";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useNotifications } from "@/hooks/useNotifications";

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import KpiCards from "@/components/dashboard/KpiCards";
import TrafficCharts from "@/components/dashboard/TrafficCharts";
import LatencyChart from "@/components/dashboard/LatencyChart";
import LiveRequestLog from "@/components/dashboard/LiveRequestLog";
import AlertsPanel from "@/components/dashboard/AlertsPanel";
import DeploymentHistory from "@/components/dashboard/DeploymentHistory";
import PodHealth from "@/components/dashboard/PodHealth";
import IncidentTimeline from "@/components/dashboard/IncidentTimeline";
import UserDirectory from "@/components/dashboard/UserDirectory";
import ReliabilityPanel from "@/components/dashboard/ReliabilityPanel";
import UserDetailModal from "@/components/dashboard/UserDetailModal";
import UserFormDialog from "@/components/dashboard/UserFormDialog";
import EnvironmentBanner from "@/components/dashboard/EnvironmentBanner";

const REFRESH_INTERVAL = 15000;
const LOG_REFRESH_INTERVAL = 3000;

interface DashboardProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

export default function Dashboard({ isDark, onToggleTheme }: DashboardProps) {
  const queryClient = useQueryClient();
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [environment, setEnvironment] = useState("all");

  const [detailUserId, setDetailUserId] = useState<number | null>(null);
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [userFormMode, setUserFormMode] = useState<"create" | "edit">("create");
  const [editUserData, setEditUserData] = useState<{ name: string; email: string; role: string } | undefined>();
  const [editUserId, setEditUserId] = useState<number | null>(null);

  const queryOptions = { refetchInterval: REFRESH_INTERVAL };

  const {
    data: healthStatus,
    isLoading: isHealthLoading,
    isError: isHealthError,
    refetch: refetchHealth,
  } = useHealthCheck({ query: queryOptions });

  const {
    data: users,
    isLoading: isUsersLoading,
  } = useListUsers({ query: queryOptions });

  const {
    data: metricsText,
    isLoading: isMetricsLoading,
  } = useGetMetrics({ query: queryOptions });

  const {
    data: requestLogs,
    isLoading: isLogsLoading,
  } = useGetRequestLogs({ query: { refetchInterval: LOG_REFRESH_INTERVAL } });

  const {
    data: deployments,
    isLoading: isDeploymentsLoading,
  } = useGetDeployments({ query: queryOptions });

  const {
    data: pods,
    isLoading: isPodsLoading,
  } = useGetPods({ query: queryOptions });

  const {
    data: incidents,
    isLoading: isIncidentsLoading,
  } = useGetIncidents({ query: queryOptions });

  const {
    data: alertConfig,
    isLoading: isAlertConfigLoading,
  } = useGetAlertConfig({ query: queryOptions });

  const {
    data: userDetail,
    isLoading: isUserDetailLoading,
  } = useGetUser(detailUserId || 0, {
    query: { enabled: detailUserId !== null },
  });

  const createUserMutation = useCreateUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        setUserFormOpen(false);
      },
    },
  });

  const updateUserMutation = useUpdateUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        setUserFormOpen(false);
        setEditUserId(null);
      },
    },
  });

  const deleteUserMutation = useDeleteUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      },
    },
  });

  const updateAlertConfigMutation = useUpdateAlertConfig({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAlertConfigQueryKey() });
      },
    },
  });

  const handleManualRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getHealthCheckQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetMetricsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetRequestLogsQueryKey() }),
    ]);
    setLastRefresh(new Date());
  }, [queryClient]);

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  useKeyboardShortcuts({
    onRefresh: handleManualRefresh,
    onToggleTheme,
    onToggleFullscreen: handleToggleFullscreen,
  });

  const metrics = useMemo(() => parsePrometheusMetrics(metricsText), [metricsText]);

  const totalPodRestarts = useMemo(
    () => pods?.reduce((s, p) => s + p.restarts, 0) || 0,
    [pods]
  );

  useNotifications(metrics, alertConfig, isHealthError, totalPodRestarts);

  const handleExportUsers = useCallback(() => {
    if (users) exportUsersCsv(users);
  }, [users]);

  const handleExportMetrics = useCallback(() => {
    exportMetricsCsv(metrics);
  }, [metrics]);

  const handleViewUser = useCallback((userId: number) => {
    setDetailUserId(userId);
  }, []);

  const handleCreateUser = useCallback(() => {
    setUserFormMode("create");
    setEditUserData(undefined);
    setEditUserId(null);
    setUserFormOpen(true);
  }, []);

  const handleEditUser = useCallback(async (user: { id: number; name: string; role: string }) => {
    setUserFormMode("edit");
    setEditUserId(user.id);
    try {
      const detail = await queryClient.fetchQuery({
        queryKey: ["/api/users", user.id],
        queryFn: () => import("@workspace/api-client-react").then(m => m.getUser(user.id)),
      });
      setEditUserData({ name: detail.name, role: detail.role, email: detail.email });
    } catch {
      setEditUserData({ name: user.name, role: user.role, email: "" });
    }
    setUserFormOpen(true);
  }, [queryClient]);

  const handleDeleteUser = useCallback((userId: number) => {
    deleteUserMutation.mutate({ id: userId });
  }, [deleteUserMutation]);

  const handleUserFormSubmit = useCallback((data: { name: string; email: string; role: string }) => {
    if (userFormMode === "create") {
      createUserMutation.mutate({ data });
    } else if (editUserId !== null) {
      updateUserMutation.mutate({ id: editUserId, data });
    }
  }, [userFormMode, editUserId, createUserMutation, updateUserMutation]);

  return (
    <div className="min-h-screen text-foreground flex flex-col font-sans">
      <DashboardHeader
        lastRefresh={lastRefresh}
        onRefresh={handleManualRefresh}
        isDark={isDark}
        onToggleTheme={onToggleTheme}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        onExportUsers={handleExportUsers}
        onExportMetrics={handleExportMetrics}
        environment={environment}
        onEnvironmentChange={setEnvironment}
      />

      <EnvironmentBanner environment={environment} onReset={() => setEnvironment("all")} />

      <main className="flex-1 container mx-auto px-4 py-6 space-y-6">
        <KpiCards
          healthStatus={healthStatus}
          isHealthLoading={isHealthLoading}
          isHealthError={isHealthError}
          userCount={users?.length || 0}
          isUsersLoading={isUsersLoading}
          metrics={metrics}
          isMetricsLoading={isMetricsLoading}
          uptimeSeconds={metrics.uptimeSeconds}
          environment={environment}
        />

        <TrafficCharts metrics={metrics} isLoading={isMetricsLoading} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LatencyChart latencyPercentiles={metrics.latencyPercentiles} isLoading={isMetricsLoading} />
          <LiveRequestLog logs={requestLogs} isLoading={isLogsLoading} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <AlertsPanel
            metrics={metrics}
            alertConfig={alertConfig}
            isAlertConfigLoading={isAlertConfigLoading}
            onUpdateConfig={(cfg) => updateAlertConfigMutation.mutate({ data: cfg })}
            podRestarts={totalPodRestarts}
          />
          <DeploymentHistory
            deployments={deployments}
            isLoading={isDeploymentsLoading}
            environmentFilter={environment}
          />
          <PodHealth pods={pods} isLoading={isPodsLoading} environmentFilter={environment} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <UserDirectory
              users={users}
              isLoading={isUsersLoading}
              onViewUser={handleViewUser}
              onCreateUser={handleCreateUser}
              onEditUser={handleEditUser}
              onDeleteUser={handleDeleteUser}
            />
          </div>
          <div className="space-y-6">
            <ReliabilityPanel
              healthStatus={healthStatus}
              isHealthLoading={isHealthLoading}
              isHealthError={isHealthError}
              metricsAvailable={!!metricsText}
              isMetricsLoading={isMetricsLoading}
              onRetryHealth={() => refetchHealth()}
            />
            <IncidentTimeline incidents={incidents} isLoading={isIncidentsLoading} environmentFilter={environment} />
          </div>
        </div>
      </main>

      <footer className="border-t border-border/30 bg-background/70">
        <div className="container mx-auto px-4 py-4 text-xs sm:text-sm text-muted-foreground flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span>Built by Mukul Saini | Deployed on Azure Kubernetes Service</span>
          <a
            href="https://github.com/MukulNvm/devops-harness-aks"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            github.com/MukulNvm/devops-harness-aks
          </a>
        </div>
      </footer>

      <UserDetailModal
        user={userDetail}
        isLoading={isUserDetailLoading}
        open={detailUserId !== null}
        onOpenChange={(open) => { if (!open) setDetailUserId(null); }}
      />

      <UserFormDialog
        open={userFormOpen}
        onOpenChange={setUserFormOpen}
        mode={userFormMode}
        initialData={editUserData}
        onSubmit={handleUserFormSubmit}
        isPending={createUserMutation.isPending || updateUserMutation.isPending}
      />
    </div>
  );
}
