# DevOps Operations Dashboard on Azure AKS

![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?style=for-the-badge&logo=kubernetes&logoColor=white)
![Azure](https://img.shields.io/badge/Azure-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white)
![Terraform](https://img.shields.io/badge/Terraform-7B42BC?style=for-the-badge&logo=terraform&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Harness](https://img.shields.io/badge/Harness-FF1A1A?style=for-the-badge&logo=harness&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=white)

Live K8s observability with real cluster data.

## Dashboard Preview

### Real-time Monitoring

| KPI Dashboard | Latency Analytics |
|---------------|-------------------|
| ![Dashboard Overview](./screenshots/1-dashboard-overview.png) | ![Latency and Logs](./screenshots/2-latency-logs.png) |

### Infrastructure and Operations

| Pod Health | User Directory |
|------------|----------------|
| ![Pod Health](./screenshots/3-pod-health.png) | ![User Directory](./screenshots/4-user-directory.png) |

### CI/CD Pipeline (Harness)

| CD Pipeline Run | Pipeline Success |
|-----------------|------------------|
| ![Harness CD Run](./screenshots/5-harness-cd-run.png) | ![Harness Green](./screenshots/6-harness-pipeline-green.png) |

## Why This Exists

Most dashboard demos stop at mock data. This dashboard reads live Kubernetes resources for pod health, deployment history, and warning events.

## What It Does

| Feature | Endpoint | Description |
|---------|----------|-------------|
| Pod health | GET /api/pods | CPU percentage, memory MB, node name, namespace |
| Deployment history | GET /api/deployments | Revision tracking from Deployments and ReplicaSets |
| Incident timeline | GET /api/incidents | Warning events from Kubernetes |
| Request logs | GET /api/request-logs | Last 100 requests (from 500-capacity buffer; frontend polls every 3s) |
| Latency analytics | GET /api/metrics | p50, p95, p99 percentiles |
| Alert config | GET and PUT /api/alerts/config | Threshold-based alerts |
| User directory | /api/users | CRUD (in-memory demo data) |
| Health check | GET /api/healthz | Liveness/readiness probe |
| Prometheus metrics | GET /api/metrics | Text format for scraping |

## Architecture

Browser (local dev: http://localhost:4173)

-> NGINX Ingress (production)
- / -> frontend-service
- /api -> backend-service
- /metrics -> backend-service (currently configured)

-> Frontend (React + Vite)
- Local port: 4173

-> Backend (Express + TypeScript)
- Container port: 8080
- Local fallback port: 8081 when PORT is not set
- API routes mounted under /api

-> Kubernetes API (RBAC read-only)
- Pods, Deployments, ReplicaSets, Events, metrics.k8s.io pod metrics
- In-cluster auth with kubectl fallback

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19.2.5, TypeScript, Vite, TanStack Query, Recharts, shadcn/ui |
| Backend | Node.js, Express, TypeScript, Pino (redacted logging) |
| API Contracts | OpenAPI 3.1.0, Orval-generated client, Zod schemas |
| Cluster | AKS, Kubernetes manifests, RBAC (read-only service account) |
| Infrastructure | Terraform (AzureRM provider) |
| CI/CD | Harness (CI + CD) |
| Monitoring | Prometheus-format metrics endpoint |
| Package Management | pnpm workspaces |

## Project Structure

```text
devops-harness-aks/
├── applications/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── app.ts
│   │   │   ├── index.ts
│   │   │   ├── lib/
│   │   │   │   ├── kubernetes.ts
│   │   │   │   ├── logger.ts
│   │   │   │   └── telemetry.ts
│   │   │   └── routes/
│   │   │       ├── health.ts
│   │   │       ├── metrics.ts
│   │   │       ├── pods.ts
│   │   │       ├── deployments.ts
│   │   │       ├── incidents.ts
│   │   │       ├── request-logs.ts
│   │   │       ├── alerts.ts
│   │   │       └── users.ts
│   │   └── Dockerfile
│   └── frontend/
│       ├── src/
│       ├── nginx.conf
│       └── Dockerfile
├── lib/
│   ├── api-spec/
│   ├── api-client-react/
│   ├── api-zod/
│   └── db/
├── kubernetes/
│   ├── backend-deployment.yaml
│   ├── backend-rbac.yaml
│   ├── backend-service.yaml
│   ├── frontend-deployment.yaml
│   ├── frontend-service.yaml
│   └── ingress.yaml
├── terraform/
│   ├── providers.tf
│   ├── main.tf
│   ├── acr.tf
│   ├── aks.tf
│   └── variables.tf
├── monitoring/
│   └── prometheus-config.yaml
├── .harness/
│   └── pipeline.yaml
├── Dockerfile.backend
├── Dockerfile.frontend
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── README.md
```

## Quick Start (Local Development)

### Prerequisites

- Node.js 20+
- pnpm 9+

### Environment Variables

| App | Variable | Default | Required |
|-----|----------|---------|----------|
| Backend | PORT | 8081 fallback | No |
| Frontend | PORT | None | Yes |
| Frontend | BASE_PATH | / | Yes |

### Install and Run

```powershell
# Install dependencies
pnpm install

# Terminal 1 - Backend (PORT optional)
cd applications/backend
pnpm build
pnpm start

# Terminal 2 - Frontend (PORT and BASE_PATH required)
cd applications/frontend
$env:PORT="4173"
$env:BASE_PATH="/"
pnpm dev
```

Frontend (dev): http://localhost:4173

Backend health: http://localhost:8081/api/healthz (or your custom PORT)

Typecheck all workspaces:

```powershell
pnpm typecheck
```

### API Endpoints

All backend endpoints are mounted under /api.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/healthz | Liveness/readiness probe |
| GET | /api/metrics | Prometheus-format metrics |
| GET | /api/request-logs | Last 100 requests |
| GET | /api/deployments | Deployment history from Kubernetes |
| GET | /api/pods | Pod health summary |
| GET | /api/incidents | Warning event timeline |
| GET | /api/alerts/config | Current alert thresholds |
| PUT | /api/alerts/config | Update alert thresholds |
| GET | /api/users | List users |
| POST | /api/users | Create user |
| GET | /api/users/:id | Get user |
| PUT | /api/users/:id | Update user (runtime route) |
| DELETE | /api/users/:id | Delete user |

OpenAPI and runtime mismatch to be aware of:

- OpenAPI spec currently defines PATCH for /users/{id}
- Runtime backend currently implements PUT for /users/:id
- Generated client follows the OpenAPI spec

Spec location: lib/api-spec/openapi.yaml

## Telemetry and Observability

Backend telemetry tracks:

- Request counters by method, route, status code
- Histogram buckets for latency (p50, p95, p99 computed in frontend)
- Active clients seen in a rolling 15-minute window
- Request log ring buffer with 500-entry capacity

Request log endpoint returns the latest 100 entries. The frontend polls every 3 seconds for near-live updates.

## Kubernetes Deployment

### Backend container and probes

- Container port: 8080
- Liveness: /api/healthz on port 8080
- Readiness: /api/healthz on port 8080

### Rolling update strategy

```yaml
strategy:
	rollingUpdate:
		maxSurge: 0
		maxUnavailable: 1
```

### RBAC scope

Read-only verbs (get, list, watch) on:

- pods, events
- deployments, replicasets
- metrics.k8s.io pods

### Ingress routes

| Path | Target |
|------|--------|
| /api/* | backend-service |
| /health | backend-service |
| /metrics | backend-service |
| /* | frontend-service |

## Infrastructure (Terraform)

Provisioned resources include:

- Resource Group
- VNet and subnet
- Azure Container Registry
- AKS cluster
- AcrPull role assignment for AKS kubelet identity

Main Terraform files are in terraform/.

## CI/CD (Harness)

Pipeline: .harness/pipeline.yaml

CI stage:

- Build backend image with Dockerfile.backend
- Build frontend image with Dockerfile.frontend
- Push both images to ACR with tag 1.0.0

CD stage:

- Fetch manifests from kubernetes/
- Deploy to production namespace
- Rolling deploy with rollback steps on failure

## Monitoring

Current Prometheus config in monitoring/prometheus-config.yaml uses:

- job_name: devops-harness-backend
- static target: backend-service.production.svc.cluster.local:8080
- metrics_path: /metrics

Note: backend route implementation serves metrics under /api/metrics. If scraping fails, align metrics_path and ingress path with /api/metrics or add a backend alias route.

## Restore Instructions

```powershell
# 1) Provision infrastructure
cd terraform
terraform init
terraform apply -auto-approve

# 2) Get AKS credentials
az aks get-credentials --resource-group <your-rg> --name <your-aks>

# 3) Apply manifests from repo root
cd ..
kubectl apply -f kubernetes/

# 4) Check ingress
kubectl get ingress -n production
```

## Security Notes

- Use environment variables or Kubernetes secrets for sensitive values
- Backend RBAC is read-only
- User directory is demo data, not production identity
- Do not commit Terraform state or secret tfvars files
