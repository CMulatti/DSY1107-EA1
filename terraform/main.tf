resource "aws_apigatewayv2_api" "api_manager" { //this creates the API GT itself
  name          = "api-mindicador"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["http://localhost:5173", local.url_amplify,]
    allow_methods = ["GET", "OPTIONS", "POST", "PUT", "DELETE"]
    allow_headers = ["Authorization", "Content-Type"]
  }
}

resource "aws_apigatewayv2_integration" "backend" {  //creates the connection from API Gateway → mindicador.cl.
  api_id                 = aws_apigatewayv2_api.api_manager.id
  integration_type       = "HTTP_PROXY"
  integration_method     = "GET"
  integration_uri        = "https://mindicador.cl/api"
  payload_format_version = "1.0"

  lifecycle {      
    ignore_changes = [integration_uri]
  }
}

resource "aws_apigatewayv2_route" "datos" {  //creates GET /datos
  api_id             = aws_apigatewayv2_api.api_manager.id
  route_key          = "GET /datos"
  target             = "integrations/${aws_apigatewayv2_integration.backend.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "datos_publico" {
  api_id    = aws_apigatewayv2_api.api_manager.id
  route_key = "GET /publico/datos"
  target    = "integrations/${aws_apigatewayv2_integration.backend.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.api_manager.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_apigatewayv2_stage" "dev" { //creates dev stage
  api_id      = aws_apigatewayv2_api.api_manager.id
  name        = "dev"
  auto_deploy = true
}

resource "aws_apigatewayv2_authorizer" "cognito" { //creates the JWT authorizer
  api_id           = aws_apigatewayv2_api.api_manager.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "cognito-authorizer"

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.spa.id]
    issuer   = "https://cognito-idp.us-east-1.amazonaws.com/${aws_cognito_user_pool.pool.id}"
  }
}

resource "aws_apigatewayv2_integration" "productos_coleccion" {
  api_id                 = aws_apigatewayv2_api.api_manager.id
  integration_type       = "HTTP_PROXY"
  integration_method     = "ANY"
  integration_uri        = "https://mindicador.cl/productos"
  payload_format_version = "1.0"

  lifecycle {
    ignore_changes = [integration_uri]
  }
}

resource "aws_apigatewayv2_integration" "productos_elemento" {
  api_id                 = aws_apigatewayv2_api.api_manager.id
  integration_type       = "HTTP_PROXY"
  integration_method     = "ANY"
  integration_uri        = "https://mindicador.cl/productos/{proxy}"
  payload_format_version = "1.0"

  lifecycle {
    ignore_changes = [integration_uri]
  }
}

//DELETED in 1.3.11
/*resource "aws_apigatewayv2_route" "productos_coleccion" {
  api_id             = aws_apigatewayv2_api.api_manager.id
  route_key          = "ANY /productos"
  target             = "integrations/${aws_apigatewayv2_integration.productos_coleccion.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "productos_elemento" {
  api_id             = aws_apigatewayv2_api.api_manager.id
  route_key          = "ANY /productos/{proxy+}"
  target             = "integrations/${aws_apigatewayv2_integration.productos_elemento.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}*/

locals {
  rutas_productos = {
    "GET /productos"             = { scope = "productos/read",  integracion = aws_apigatewayv2_integration.productos_coleccion.id }
    "POST /productos"            = { scope = "productos/write", integracion = aws_apigatewayv2_integration.productos_coleccion.id }
    "GET /productos/{proxy+}"    = { scope = "productos/read",  integracion = aws_apigatewayv2_integration.productos_elemento.id }
    "PUT /productos/{proxy+}"    = { scope = "productos/write", integracion = aws_apigatewayv2_integration.productos_elemento.id }
    "DELETE /productos/{proxy+}" = { scope = "productos/write", integracion = aws_apigatewayv2_integration.productos_elemento.id }
  }
}

resource "aws_apigatewayv2_route" "productos" {
  for_each = local.rutas_productos

  api_id    = aws_apigatewayv2_api.api_manager.id
  route_key = each.key
  target    = "integrations/${each.value.integracion}"

  authorization_type   = "JWT"
  authorizer_id         = aws_apigatewayv2_authorizer.cognito.id
  authorization_scopes = [each.value.scope]
}


//------------------------API GT OUTPUTS ------------------------

output "api_id" {
  value = aws_apigatewayv2_api.api_manager.id
}

output "integracion_id" {
  value = aws_apigatewayv2_integration.backend.id
}

output "integracion_productos_coleccion_id" {
  value = aws_apigatewayv2_integration.productos_coleccion.id
}

output "integracion_productos_elemento_id" {
  value = aws_apigatewayv2_integration.productos_elemento.id
}