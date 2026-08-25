output "env_frontend" {
  value = <<-EOT
VITE_AWS_REGION=us-east-1
VITE_COGNITO_DOMAIN=https://${aws_cognito_user_pool_domain.hosted_ui.domain}.auth.us-east-1.amazoncognito.com
VITE_COGNITO_CLIENT_ID=${aws_cognito_user_pool_client.spa.id}
VITE_REDIRECT_URI=http://localhost:5173/
VITE_API_URL=${aws_apigatewayv2_stage.dev.invoke_url}
EOT
}