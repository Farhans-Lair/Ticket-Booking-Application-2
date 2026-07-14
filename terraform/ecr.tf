# ---------------------------
# ECR Repository
# ---------------------------
# Managed by Terraform so it exists before GitHub Actions runs.
# Phase 1: terraform apply -target=aws_ecr_repository.ticket_backend
# Phase 2: git push (CI/CD pushes image)
# Phase 3: terraform apply (full infra — EC2 pulls image on first boot)

resource "aws_ecr_repository" "ticket_backend" {
  name                 = "ticket-backend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = "${var.project_name}-ecr"
  }
}

# Auto-delete untagged images older than 7 days to keep storage costs low
resource "aws_ecr_lifecycle_policy" "ticket_backend" {
  repository = aws_ecr_repository.ticket_backend.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Remove untagged images after 7 days"
      selection = {
        tagStatus   = "untagged"
        countType   = "sinceImagePushed"
        countUnit   = "days"
        countNumber = 7
      }
      action = { type = "expire" }
    }]
  })
}

output "ecr_repository_url" {
  value = aws_ecr_repository.ticket_backend.repository_url
}
