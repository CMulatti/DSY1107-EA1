

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
import {useEffect, useState} from 'react'
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
}