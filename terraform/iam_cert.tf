# =============================================================
#  iam_cert.tf
#
#  Uploads a mkcert self-signed TLS certificate to IAM so the
#  ALB HTTPS listener can terminate TLS.
#
#  Spring Boot runs plain HTTP (USE_HTTPS=false in .env).
#  The JVM never sees raw TLS — the ALB handles it here.
#
#  Prerequisites (run once before terraform apply):
#    1. mkcert -install
#    2. cd certs/ && mkcert localhost 127.0.0.1 <your-alb-dns>
#       → creates certs/server.crt and certs/server.key
#    3. Set cert_chain_path in terraform.tfvars:
#         cert_chain_path = "/home/user/.local/share/mkcert/rootCA.pem"
# =============================================================

resource "aws_iam_server_certificate" "self_signed" {
  # Hash-suffixed name → auto-changes when cert is regenerated.
  # create_before_destroy keeps the ALB serving HTTPS during rotation.
  name = "${var.project_name}-selfsigned-${substr(sha256(file("${path.module}/../certs/server.crt")), 0, 8)}"

  certificate_body  = file("${path.module}/../certs/server.crt")
  private_key       = file("${path.module}/../certs/server.key")
  certificate_chain = file(var.cert_chain_path)

  lifecycle {
    create_before_destroy = true
  }
}
