import { getAccessToken } from './auth.js'
import { getConfig } from './config.js'

/** Respuesta uniforme para poder mostrar SIEMPRE el código HTTP en pantalla. */
async function ejecutar(descripcion, promesa) {
  try {
    const respuesta = await promesa
    const texto = await respuesta.text()
    let cuerpo
    try {
      cuerpo = JSON.parse(texto)
    } catch {
      cuerpo = texto
    }
    return {descripcion, status: respuesta.status, ok: respuesta.ok, cuerpo}
  } catch (error) {
    return {descripcion, status: 0, ok: false, cuerpo: `Error de red o CORS: ${error.message}`}
  }
}

/** 1. El endpoint estándar de OIDC: la identidad según el estándar. */
export function obtenerUserInfo() {
  const { cognitoDomain } = getConfig()
  return ejecutar(
    'GET /oauth2/userInfo (OIDC)',
    fetch(`${cognitoDomain}/oauth2/userInfo`, {
      headers: {Authorization: `Bearer ${getAccessToken()}`},
    })
  )
}

/** 2. La API propietaria de AWS. El token va en el cuerpo, no en el header. */
export function obtenerUsuarioCognito() {
  const { region } = getConfig()
  return ejecutar(
    'POST cognito-idp GetUser (API de AWS)',
    fetch(`https://cognito-idp.${region}.amazonaws.com/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.GetUser',
      },
      body: JSON.stringify({AccessToken: getAccessToken()}),
    })
  )
}

/** 3. La API de la actividad 1.1.2, ahora detrás del authorizer. */
export function obtenerIndicadores(conToken = true) {
  const { apiUrl } = getConfig()
  return ejecutar(
    conToken ? 'GET /datos con token' : 'GET /datos SIN token',
    fetch(`${apiUrl}/datos`, {
      headers: conToken ? {Authorization: `Bearer ${getAccessToken()}`} : {},
    })
  )
}

/** La ruta gemela sin authorizer, solo para comparar. */
export function obtenerIndicadoresPublicos() {
  const { apiUrl } = getConfig()
  return ejecutar(
    'GET /publico/datos (ruta sin proteger)',
    fetch(`${apiUrl}/publico/datos`)
  )
}