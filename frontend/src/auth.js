
import { getConfig } from './config.js'

const SCOPES = 'openid email profile aws.cognito.signin.user.admin'

//-------------------------- PKCE FUNCTIONS ---------------------------------//
function base64Url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function aleatorioBase64Url(bytes = 32) {
  const buffer = new Uint8Array(bytes) //creates a little container for random bytes.
  crypto.getRandomValues(buffer) //asks the browser's cryptographic random-number generator to fill it.
  return base64Url(buffer)  //converts those bytes into a convenient text representation.
}

/** El challenge es el SHA-256 del verifier. Viaja en /authorize; el verifier no. */
async function calcularChallenge(verifier) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64Url(hash)
}

// just bundles the functions for our manual console (Solo para el experimento del paso 2. Bórralo después.)
export const _pkce = { aleatorioBase64Url, calcularChallenge }

//-------------------------- STEP 3: SALIDA AL IDaaS -------------------------//
const CLAVE_VERIFIER = 'dsy1107.pkce_verifier'
const CLAVE_STATE = 'dsy1107.state'
const CLAVE_TOKENS = 'dsy1107.tokens'

export async function login() {
  const { cognitoDomain, clientId, redirectUri } = getConfig()

  const verifier = aleatorioBase64Url()
  const challenge = await calcularChallenge(verifier)
  const state = aleatorioBase64Url(16)

   /* El verifier y el state se quedan aquí: son la prueba de que este mismo
navegador, en esta misma pestaña, fue el que inició el flujo. */
  sessionStorage.setItem(CLAVE_VERIFIER, verifier)
  sessionStorage.setItem(CLAVE_STATE, state)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })

  // A partir de aquí la contraseña la escribe el usuario en Cognito.
// Tu front nunca la ve: ese es el punto de OAuth2.
  window.location.assign(`${cognitoDomain}/oauth2/authorize?${params}`)
}

//-------------------------- STEP 4: Code exchange ----------------------------------//
/*Step 4 is the second half of the OAuth dance: exchanging the one-time code we got back from Cognito for actual usable tokens. 
The code by itself is worthless, it can't call any API, it's just proof we completed login, and it expires almost immediately if unused.*/

/*sessionStorage only stores strings, so tokens get saved as a JSON string and parsed back into an object on read. 
getAccessToken/getIdToken just pull one field out (we'll use access_token in Step 6 to call the protected API, and id_token in Step 5 to read the user's claims.)
They're different tokens with different jobs, which is a very OAuth/OIDC-specific distinction (a plain JWT setup in Spring wouldn't normally separate these).*/

export function getTokens() {
  const crudo = sessionStorage.getItem(CLAVE_TOKENS)
  return crudo ? JSON.parse(crudo) : null
}
export function getAccessToken() {
  return getTokens()?.access_token ?? null
}
export function getIdToken() {
  return getTokens()?.id_token ?? null
}

//Saca el ?code= de la barra de direcciones: ya se usó y no se puede reutilizar.
function limpiarUrl() {
  window.history.replaceState({}, document.title, window.location.pathname)
}

export async function procesarRetorno() {
  const { cognitoDomain, clientId, redirectUri } = getConfig()

  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  if (error) {
    limpiarUrl()
    throw new Error(`${error}: ${url.searchParams.get('error_description') ?? ''}`)
  }
  if (!code) return null

  // Si el state no calza, la respuesta no corresponde a la petición que
// iniciamos: es la defensa contra CSRF del propio flujo.
  if (state !== sessionStorage.getItem(CLAVE_STATE)) {      //Compares what Cognito sent back against what we stored before redirecting away in Step 3.
    limpiarUrl()
    throw new Error('El parámetro state no coincide. Se descarta la respuesta.')
  }

  const verifier = sessionStorage.getItem(CLAVE_VERIFIER)    //the code_challenge (a hash) was the only thing sent publicly in Step 3's URL. The real verifier never left this browser tab until now.
  if (!verifier) {
    limpiarUrl()
    throw new Error('No hay code_verifier en esta pestaña. Vuelve a iniciar sesión.')
  }


  // TOKEN EXCHANGE 
/*Note this is a direct POST from your browser to Cognito, not a redirect — no page navigation this time. 
Cognito now has both pieces: the code (proves the user logged in) and the code_verifier (proves this specific client is who requested it, 
by hashing it and checking it matches the code_challenge from Step 3). Only then does it release tokens.*/
  const respuesta = await fetch(`${cognitoDomain}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  })

  const datos = await respuesta.json()

  //Verifier and state are one-time-use — delete them regardless of outcome so a stale value can't accidentally get reused on a future attempt.
  limpiarUrl()
  sessionStorage.removeItem(CLAVE_VERIFIER)
  sessionStorage.removeItem(CLAVE_STATE)

  if (!respuesta.ok) {
    throw new Error(`/token respondió ${respuesta.status}: ${datos.error ?? 'error desconocido'}`)
  }

  sessionStorage.setItem(CLAVE_TOKENS, JSON.stringify(datos))
  return datos
}

//-------------------------- STEP 5: LEER CLAIMS -----------------------------//
/*Decodifica el payload de un JWT. NO verifica la firma: eso lo hace el API Gateway con las claves públicas de /jwks. 
Aquí solo se lee para mostrarlo.*/

export function decodificarJwt(token) {
  if (!token) return null
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    return null
  }
}

export function estaExpirado(token) {
  const exp = decodificarJwt(token)?.exp
  return exp ? exp * 1000 < Date.now() : true
}

//-------------------------- STEP 7: LOGOUT ----------------------------------//
export function logout() {
  const { cognitoDomain, clientId, redirectUri } = getConfig()

  sessionStorage.removeItem(CLAVE_TOKENS)
    // Borrar el token local NO cierra la sesión en el IDaaS. Si no pasamos por logout, el próximo login entra solo: eso es SSO (single sign on)

  const params = new URLSearchParams({
    client_id: clientId,
    logout_uri: redirectUri,
  })
  window.location.assign(`${cognitoDomain}/logout?${params}`)
}