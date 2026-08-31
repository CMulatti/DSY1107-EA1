

/*dump the config to the screen just to prove the plumbing works before building real UI
if faltantes (missing keys) is non-empty, show an error message naming what's missing. 
Otherwise, pretty-print the whole config object so you can visually confirm all 5 (well, 4 in this object — region presumably lives elsewhere) values loaded correctly.

import {config, configuracionIncompleta, login} from './auth.js'

export default function App() {
  const faltantes = configuracionIncompleta()

  return (
    <main>
      <h1>DSY1107 · Identidad con Cognito</h1>
      {faltantes.length > 0 ? (
        <p>Falta configurar: {faltantes.join(', ')}</p>
        ) : (
        <pre>{JSON.stringify(config, null, 2)}</pre>
        )}
    </main>
  )
}
*/

//replaced <pre> with button (STEP 3)
/*import {configuracionIncompleta, login} from './auth.js'
export default function App() {
  const faltantes = configuracionIncompleta()

  return (
    <main>
      <h1>DSY1107 · Identidad con Cognito</h1>
      {faltantes.length > 0 ? (
        <p>Falta configurar: {faltantes.join(', ')}</p>
        ) : (
        <button onClick = {login} > Iniciar sesión con Cognito
        </button>
        )}
    </main>
  )
}*/

//STEP4
/*import {useEffect, useState} from 'react'
import {login, procesarRetorno, getTokens} from './auth.js'

export default function App() {
  const [tokens, setTokens] = useState(getTokens())
  const [error, setError] = useState(null)
  useEffect(() => {
    procesarRetorno()
    .then((nuevos) => nuevos && setTokens(nuevos))
    .catch((e) => setError(e.message))
  }, [])

return (
<main>
  <h1>DSY1107 · Identidad con Cognito</h1>
  {error && <p className="error">{error}</p>}
  {tokens ? <p>Sesión iniciada.</p> : <button onClick={login}>Iniciar sesión con Cognito</button>}
  </main>
  )
}*/

//STEP 5
/*import {useEffect, useState} from 'react'
import {
  login,
  procesarRetorno,
  getTokens,
  getIdToken,
  getAccessToken,
  decodificarJwt,
  estaExpirado,
} from './auth.js'

export default function App() {
  const [tokens, setTokens] = useState(getTokens())
  const [error, setError] = useState(null)

  useEffect(() => {
    procesarRetorno()
      .then((nuevos) => nuevos && setTokens(nuevos))
      .catch((e) => setError(e.message))
  }, [])

  const idClaims = decodificarJwt(getIdToken())
  const accessClaims = decodificarJwt(getAccessToken())
  const sesionActiva = Boolean(tokens) && !estaExpirado(getAccessToken())

  return (
    <main>
      <h1>DSY1107 · Identidad con Cognito</h1>
      {error && <p className="error">{error}</p>}
      {tokens ? <p>Sesión iniciada.</p> : <button onClick={login}>Iniciar sesión con Cognito</button>}

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
        </>
      )}
    </main>
  )
}*/


//STEP 6
import {useEffect, useState} from 'react'
import {login,procesarRetorno,getTokens,getIdToken,getAccessToken,decodificarJwt,estaExpirado,} from './auth.js'
import {obtenerUserInfo,obtenerUsuarioCognito,obtenerIndicadores,obtenerIndicadoresPublicos,} from './api.js'

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
      {tokens ? <p>Sesión iniciada.</p> : <button onClick={login}>Iniciar sesión con Cognito</button>}

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