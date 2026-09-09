let cfg = null

export async function cargarConfig() {
  const respuesta = await fetch('/config.json')
  cfg = await respuesta.json()
}

export function getConfig() {
  return cfg
}