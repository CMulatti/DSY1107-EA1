
//--------------------------COGNITO CONFIGURATION ---------------------------------------------------------------------//

const cfg = {
    dominio: import.meta.env.VITE_COGNITO_DOMAIN,
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
    redirectUri: import.meta.env.VITE_REDIRECT_URI,
    scopes: 'openid email profile aws.cognito.signin.user.admin',  // openid es obligatorio en OIDC; el último habilita la API GetUser de Cognito.
}

export const config = cfg

/** Devuelve las claves que quedaron sin valor. Sirve para no depurar a ciegas. */
export function configuracionIncompleta() {
    return Object.entries(cfg)
        .filter(([, valor]) => !valor)
        .map(([clave]) => clave)
}


//-------------------------- PKCE FUNCTIONS ---------------------------------------------------------------------//
function base64Url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function aleatorioBase64Url(bytes = 32) {
  const buffer = new Uint8Array(bytes)    //creates a little container for random bytes.
  crypto.getRandomValues(buffer)    //asks the browser's cryptographic random-number generator to fill it.
  return base64Url(buffer)   //converts those bytes into a convenient text representation.
}

/** El challenge es el SHA-256 del verifier. Viaja en /authorize; el verifier no. */
async function calcularChallenge(verifier) {     //It receives the verifier.
  const hash = await crypto.subtle.digest(       //"Take this text and calculate its SHA-256 hash."
    'SHA-256',
    new TextEncoder().encode(verifier)
  )
  return base64Url(hash)

}

// Solo para el experimento del paso 2. Bórralo después.
export const _pkce = { aleatorioBase64Url, calcularChallenge }

