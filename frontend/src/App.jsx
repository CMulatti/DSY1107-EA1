import {useEffect, useState} from 'react'
import {login, logout, procesarRetorno, getTokens, getIdToken, getAccessToken, decodificarJwt, estaExpirado} from './auth.js'
import {obtenerUserInfo, obtenerUsuarioCognito, obtenerIndicadores, obtenerIndicadoresPublicos} from './api.js'
import {getConfig} from './config.js'

const CLAVES_REQUERIDAS = ['region', 'cognitoDomain', 'clientId', 'redirectUri', 'apiUrl']

export default function App() {
  const [tokens, setTokens] = useState(getTokens())
  const [error, setError] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    procesarRetorno()
      .then((nuevos) => nuevos && setTokens(nuevos))
      .catch((e) => setError(e.message))
  }, [])

  const config = getConfig()
  const faltantes = config
    ? CLAVES_REQUERIDAS.filter((clave) => !config[clave])
    : ['config.json no se pudo cargar']

  const idClaims = decodificarJwt(getIdToken())
  const accessClaims = decodificarJwt(getAccessToken())
  const sesionActiva = Boolean(tokens) && !estaExpirado(getAccessToken())

  async function llamar(fn) {
    setCargando(true)
    setResultado(await fn())
    setCargando(false)
  }

  return (
    <main>
      <h1>DSY1107 · Identidad con Cognito</h1>
      {error && <p className="error">{error}</p>}

      {faltantes.length > 0 ? (
        <p>Falta configurar: {faltantes.join(', ')}</p>
      ) : tokens ? (
        <p>Sesión iniciada.</p>
      ) : (
        <button onClick={login}>Iniciar sesión con Cognito</button>
      )}

      {sesionActiva && (
        <>
          <details open>
            <summary>ID Token · claims</summary>
            <pre>{JSON.stringify(idClaims, null, 2)}</pre>
          </details>
          <details>
            <summary>Access Token · claims</summary>
            <pre>{JSON.stringify(accessClaims, null, 2)}</pre>
          </details>

          <div className="botones">
            <button onClick={() => llamar(obtenerUserInfo)}>/oauth2/userInfo</button>
            <button onClick={() => llamar(obtenerUsuarioCognito)}>Cognito GetUser</button>
            <button onClick={() => llamar(() => obtenerIndicadores(true))}>/datos con token</button>
            <button className="peligro" onClick={() => llamar(() => obtenerIndicadores(false))}>
              /datos sin token
            </button>
            <button onClick={() => llamar(obtenerIndicadoresPublicos)}>/publico/datos</button>
          </div>

          <button onClick={logout}>Cerrar sesión</button>

          {cargando && <p>Llamando…</p>}
          {resultado && !cargando && (
            <div className={resultado.ok ? 'resultado ok' : 'resultado falla'}>
              <p><strong>{resultado.descripcion}</strong> → HTTP {resultado.status || 'sin respuesta'}</p>
              <pre>{JSON.stringify(resultado.cuerpo, null, 2)}</pre>
            </div>
          )}
        </>
      )}
    </main>
  )
}