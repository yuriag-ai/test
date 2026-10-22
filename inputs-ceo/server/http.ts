import { ErroProcessamento, iaConfigurada, processar, validarPedido } from './processar.js'

function json(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

/** Handler Web padrão (Request → Response), usado pela Vercel e pelo servidor de desenvolvimento. */
export async function tratarProcessar(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ erro: 'Use POST.' }, 405)
  let corpo: unknown
  try {
    corpo = await req.json()
  } catch {
    return json({ erro: 'JSON inválido.' }, 400)
  }
  try {
    const resultado = await processar(validarPedido(corpo))
    return json(resultado)
  } catch (erro) {
    if (erro instanceof ErroProcessamento) return json({ erro: erro.message }, erro.status)
    console.error('[processar]', erro)
    return json({ erro: 'Erro inesperado ao processar.' }, 500)
  }
}

export function tratarStatus(): Response {
  return json({ ia: iaConfigurada() })
}
