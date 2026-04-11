# devops-harness-aks

Production-style DevOps project using Azure, AKS, ACR, Terraform, Docker, Kubernetes manifests, Prometheus metrics, and Harness CI/CD.

## Stack
- Backend: Node.js/Express
- Frontend: React
- Infra: Azure Resource Group, VNet, Subnet, ACR, AKS
- Provisioning: Terraform
- Deployment: Kubernetes manifests with Ingress
- Monitoring: Prometheus `/metrics`
- CI/CD: Harness pipeline

## Required Images
- `acrdevopsharnessy8v9wc.azurecr.io/backend:1.0.0`
- `acrdevopsharnessy8v9wc.azurecr.io/frontend:1.0.0`

## Backend Endpoints
- `/health`
- `/api/users`
- `/metrics`

## Namespace and Ingress
- Namespace: `production`
- Ingress: `devops-harness-ingress`

## Local Development
### Backend
```powershell
cd applications/backend
npm install
npm start
