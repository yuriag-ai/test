export function novoId(): string {
  return crypto.randomUUID()
}

export function agoraISO(): string {
  return new Date().toISOString()
}

/** Data local no formato YYYY-MM-DD. */
export function hojeISO(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dia}`
}

export function horaAgora(d = new Date()): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export function formatarData(iso: string, comAno = false): string {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${String(d).padStart(2, '0')} ${MESES[m - 1]}${comAno ? ` ${y}` : ''}`
}

export function formatarDataHora(iso: string): string {
  const d = new Date(iso)
  return `${formatarData(hojeISO(d))} · ${horaAgora(d)}`
}

export function formatarDuracao(seg: number): string {
  const h = Math.floor(seg / 3600)
  const m = Math.floor((seg % 3600) / 60)
  const s = Math.floor(seg % 60)
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function diasAte(iso: string, hoje = hojeISO()): number {
  const a = Date.UTC(...(iso.split('-').map(Number) as [number, number, number]))
  const b = Date.UTC(...(hoje.split('-').map(Number) as [number, number, number]))
  return Math.round((a - b) / 86_400_000)
}

export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

export function unicos(lista: string[]): string[] {
  const vistos = new Set<string>()
  const saida: string[] = []
  for (const item of lista) {
    const chave = normalizar(item)
    if (!chave || vistos.has(chave)) continue
    vistos.add(chave)
    saida.push(item.trim())
  }
  return saida
}

export function somarDiasISO(dias: number, base = hojeISO()): string {
  const [a, m, d] = base.split('-').map(Number)
  return hojeISO(new Date(a, m - 1, d + dias))
}
