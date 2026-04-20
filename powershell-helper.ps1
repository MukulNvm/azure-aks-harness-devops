[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("stop", "start", "status")]
  [string]$Action,

  [string]$ResourceGroup = "rg-devops-harness-aks",
  [string]$AksName = "devops-harness-aks-cluster",
  [switch]$GetCredentialsAfterStart,
  [string]$SubscriptionId
)

$ErrorActionPreference = "Stop"

function Test-ToolAvailable {
  param([Parameter(Mandatory = $true)][string]$ToolName)

  return [bool](Get-Command $ToolName -ErrorAction SilentlyContinue)
}

function Ensure-AzureLogin {
  param([string]$Subscription)

  az account show --only-show-errors 1>$null 2>$null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "No Azure login session found. Running az login..." -ForegroundColor Yellow
    az login --only-show-errors 1>$null
    if ($LASTEXITCODE -ne 0) {
      throw "Azure login failed."
    }
  }

  if ($Subscription) {
    Write-Host "Setting Azure subscription to $Subscription" -ForegroundColor Cyan
    az account set --subscription $Subscription --only-show-errors
  }
}

function Invoke-AksCreditSaver {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("stop", "start", "status")]
    [string]$Mode,

    [Parameter(Mandatory = $true)]
    [string]$Group,

    [Parameter(Mandatory = $true)]
    [string]$Cluster,

    [switch]$FetchCredentials,
    [string]$Subscription
  )

  if (-not (Test-ToolAvailable -ToolName "az")) {
    throw "Azure CLI (az) is not installed or not on PATH."
  }

  Ensure-AzureLogin -Subscription $Subscription

  switch ($Mode) {
    "stop" {
      Write-Host "Stopping AKS cluster '$Cluster' in resource group '$Group'..." -ForegroundColor Cyan
      az aks stop --resource-group $Group --name $Cluster --only-show-errors
    }
    "start" {
      Write-Host "Starting AKS cluster '$Cluster' in resource group '$Group'..." -ForegroundColor Cyan
      az aks start --resource-group $Group --name $Cluster --only-show-errors

      if ($FetchCredentials) {
        Write-Host "Fetching kubeconfig credentials..." -ForegroundColor Cyan
        az aks get-credentials --resource-group $Group --name $Cluster --overwrite-existing --only-show-errors

        if (Test-ToolAvailable -ToolName "kubectl") {
          Write-Host "Checking node readiness..." -ForegroundColor Cyan
          kubectl get nodes
        }
      }
    }
    "status" {
      Write-Host "Reading AKS cluster status..." -ForegroundColor Cyan
    }
  }

  $powerState = az aks show --resource-group $Group --name $Cluster --query "powerState.code" -o tsv --only-show-errors
  $nodePools = az aks show --resource-group $Group --name $Cluster --query "agentPoolProfiles[].{name:name,count:count,vmSize:vmSize,mode:mode}" -o table --only-show-errors

  Write-Host ""
  Write-Host "AKS Power State: $powerState" -ForegroundColor Green
  Write-Host ""
  Write-Host "Node Pools:" -ForegroundColor Green
  $nodePools

  return [pscustomobject]@{
    Action       = $Mode
    ResourceGroup = $Group
    AksName      = $Cluster
    PowerState   = $powerState
    CheckedAt    = (Get-Date).ToString("s")
  }
}

Invoke-AksCreditSaver -Mode $Action -Group $ResourceGroup -Cluster $AksName -FetchCredentials:$GetCredentialsAfterStart -Subscription $SubscriptionId
