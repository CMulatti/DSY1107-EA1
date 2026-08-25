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