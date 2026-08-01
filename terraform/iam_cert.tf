
resource "aws_iam_server_certificate" "self_signed" {
  name = "${var.project_name}-selfsigned-${substr(sha256(file("${path.module}/../certs/server.crt")), 0, 8)}"

  certificate_body  = file("${path.module}/../certs/server.crt")
  private_key       = file("${path.module}/../certs/server.key")
  certificate_chain = file(var.cert_chain_path)

  lifecycle {
    create_before_destroy = true
  }
}
