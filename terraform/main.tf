provider "aws" {
  region = var.aws_region
}

resource "aws_vpc" "campusconnect" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name        = "campusconnect-vpc"
    Environment = var.environment
  }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.campusconnect.id
  cidr_block              = var.public_subnet_cidr
  map_public_ip_on_launch = true

  tags = {
    Name        = "campusconnect-public"
    Environment = var.environment
  }
}

output "vpc_id" {
  description = "VPC ID created by the CampusConnect Terraform lab."
  value       = aws_vpc.campusconnect.id
}
