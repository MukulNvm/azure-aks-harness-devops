variable "subscription_id" {
  description = "Azure subscription ID"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "centralindia"
}

variable "resource_group_name" {
  description = "Resource group name"
  type        = string
  default     = "rg-devops-harness-aks"
}

variable "vnet_name" {
  description = "Virtual network name"
  type        = string
  default     = "vnet-devops-harness-aks"
}

variable "subnet_name" {
  description = "Subnet name for AKS"
  type        = string
  default     = "snet-aks"
}

variable "aks_name" {
  description = "AKS cluster name"
  type        = string
  default     = "devops-harness-aks-cluster"
}

variable "dns_prefix" {
  description = "AKS DNS prefix"
  type        = string
  default     = "devops-harness-y8v9wc"
}

variable "acr_name" {
  description = "Azure Container Registry name"
  type        = string
  default     = "acrdevopsharnessy8v9wc"
}

variable "node_count" {
  description = "AKS node count"
  type        = number
  default     = 1
}

variable "vm_size" {
  description = "AKS node size"
  type        = string
  default     = "Standard_B2s"
}

variable "ssh_public_key" {
  description = "SSH public key for AKS Linux nodes"
  type        = string
}
