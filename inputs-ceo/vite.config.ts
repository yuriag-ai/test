import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'

/** Serve as funções de /api durante o `npm run dev`, com o mesmo código usado na Vercel. */
function apiLocal(): Plugin {
  return {
    name: 'api-local',
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        const url = req.url ?? ''
        if (!url.startsWith('/api/')) return next()
        const { tratarProcessar, tratarStatus } = await import('./server/http.js')
        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(chunk as Buffer)
        const request = new Request(`http://localhost${url}`, {
          method: req.method,
          headers: { 'content-type': req.headers['content-type'] ?? 'application/json' },
          body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
        })
        let response: Response
        if (url.startsWith('/api/processar')) response = await tratarProcessar(request)
        else if (url.startsWith('/api/status')) response = tratarStatus()
        else response = new Response(JSON.stringify({ erro: 'Não encontrado' }), { status: 404 })
        res.statusCode = response.status
        response.headers.forEach((valor, chave) => res.setHeader(chave, valor))
        res.end(await response.text())
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Disponibiliza ANTHROPIC_API_KEY (sem prefixo VITE_) apenas para o lado servidor.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return {
    plugins: [react(), apiLocal()],
    server: { port: 5174 },
  }
})
