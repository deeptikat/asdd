variable "aws_region" {
  description = "AWS region for this classroom provisioning exercise."
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment label applied to created resources."
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  description = "IPv4 range for the VPC."
  type        = string
  default     = "10.40.0.0/16"
}

variable "public_subnet_cidr" {
  description = "IPv4 range for the public subnet."
  type        = string
  default     = "10.40.1.0/24"
}
