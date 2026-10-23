// Monta a versão de teste (página do claude.ai) num único HTML: CSS e JS embutidos,
// sem <!doctype>/<html>/<head>/<body> (o claude.ai envolve a página no próprio esqueleto).
// Uso: node scripts/gerar-artifact.mjs <saida.html> [--carga <inputs.json>]
//      (depois de `VITE_ALVO=artifact vite build --outDir dist-artifact`)
// --carga embute inputs iniciais ({id, inputs: [...]}) só no HTML gerado; o arquivo de dados fica fora do repositório.
import fs from 'node:fs'
import path from 'node:path'

const pasta = 'dist-artifact'
const args = process.argv.slice(2)
const posCarga = args.indexOf('--carga')
const arquivoCarga = posCarga >= 0 ? args[posCarga + 1] : null
const saida = args.find((a, i) => !a.startsWith('--') && i !== posCarga + 1) ?? path.join(pasta, 'inputs-ceo.html')
const indice = fs.readFileSync(path.join(pasta, 'index.html'), 'utf8')

const arquivoJs = indice.match(/<script[^>]+src="([^"]+\.js)"/)?.[1]
const arquivoCss = indice.match(/<link[^>]+href="([^"]+\.css)"/)?.[1]
if (!arquivoJs || !arquivoCss) throw new Error('Não encontrei o JS/CSS gerados pelo Vite em dist-artifact/index.html')

const ler = (url) => fs.readFileSync(path.join(pasta, url.replace(/^\.?\//, '')), 'utf8')
// Dentro de <script>, "</script" e "<!--" quebrariam o HTML; as versões escapadas valem o mesmo em JS.
const js = ler(arquivoJs).replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--')
const css = ler(arquivoCss).replace(/<\/style/gi, '<\\/style')

// JSON dentro de <script>: "</" vira "<\/", que continua sendo JSON válido.
const carga = arquivoCarga
  ? `<script type="application/json" id="carga-inicial">${JSON.stringify(JSON.parse(fs.readFileSync(arquivoCarga, 'utf8'))).replace(/<\//g, '<\\/')}</script>\n`
  : ''

const fontes =
  'https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,500;6..96,600&family=Inter:wght@400;500;600&display=swap'

const html = `<title>Inputs CEO</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${fontes}">
<style>
${css}
</style>
<div id="root"></div>
${carga}<script type="module">
${js}
</script>
`
fs.writeFileSync(saida, html)
console.log(`${saida}: ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`)
