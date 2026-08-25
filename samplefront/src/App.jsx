import {config, configuracionIncompleta} from './auth.js'

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
