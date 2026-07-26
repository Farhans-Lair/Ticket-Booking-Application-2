
resource "aws_vpc" "ticket_vpc" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = { Name = "${var.project_name}-vpc" }
}

resource "aws_internet_gateway" "ticket_igw" {
  vpc_id = aws_vpc.ticket_vpc.id
  tags   = { Name = "${var.project_name}-igw" }
}

resource "aws_subnet" "public_subnet_1" {
  vpc_id                  = aws_vpc.ticket_vpc.id
  cidr_block              = var.public_subnet_1_cidr
  availability_zone       = "ap-south-1a"
  map_public_ip_on_launch = true
  tags = { Name = "${var.project_name}-public-subnet-1" }
}

resource "aws_subnet" "public_subnet_2" {
  vpc_id                  = aws_vpc.ticket_vpc.id
  cidr_block              = var.public_subnet_2_cidr
  availability_zone       = "ap-south-1b"
  map_public_ip_on_launch = true
  tags = { Name = "${var.project_name}-public-subnet-2" }
}

resource "aws_subnet" "private_subnet_1" {
  vpc_id                  = aws_vpc.ticket_vpc.id
  cidr_block              = var.private_subnet_1_cidr
  availability_zone       = "ap-south-1a"
  map_public_ip_on_launch = false   # no public IPs — eliminates attack surface
  tags = { Name = "${var.project_name}-private-subnet-1" }
}

resource "aws_subnet" "private_subnet_2" {
  vpc_id                  = aws_vpc.ticket_vpc.id
  cidr_block              = var.private_subnet_2_cidr
  availability_zone       = "ap-south-1b"
  map_public_ip_on_launch = false
  tags = { Name = "${var.project_name}-private-subnet-2" }
}

resource "aws_eip" "nat_eip" {
  domain = "vpc"
  tags   = { Name = "${var.project_name}-nat-eip" }
}

resource "aws_nat_gateway" "ticket_nat" {
  allocation_id = aws_eip.nat_eip.id
  subnet_id     = aws_subnet.public_subnet_1.id   # NAT lives in public subnet
  depends_on    = [aws_internet_gateway.ticket_igw]
  tags          = { Name = "${var.project_name}-nat" }
}

resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.ticket_vpc.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.ticket_igw.id
  }
  tags = { Name = "${var.project_name}-public-rt" }
}

resource "aws_route_table_association" "public_rt_assoc_1" {
  subnet_id      = aws_subnet.public_subnet_1.id
  route_table_id = aws_route_table.public_rt.id
}

resource "aws_route_table_association" "public_rt_assoc_2" {
  subnet_id      = aws_subnet.public_subnet_2.id
  route_table_id = aws_route_table.public_rt.id
}

resource "aws_main_route_table_association" "set_public_rt_main" {
  vpc_id         = aws_vpc.ticket_vpc.id
  route_table_id = aws_route_table.public_rt.id
}

resource "aws_route_table" "private_rt" {
  vpc_id = aws_vpc.ticket_vpc.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.ticket_nat.id
  }
  tags = { Name = "${var.project_name}-private-rt" }
}

resource "aws_route_table_association" "private_rt_assoc_1" {
  subnet_id      = aws_subnet.private_subnet_1.id
  route_table_id = aws_route_table.private_rt.id
}

resource "aws_route_table_association" "private_rt_assoc_2" {
  subnet_id      = aws_subnet.private_subnet_2.id
  route_table_id = aws_route_table.private_rt.id
}
