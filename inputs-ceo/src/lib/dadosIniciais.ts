import { EM_ARTIFACT } from './ambiente'
import { adicionarNota, criarInputs, db, type NovoInput } from './db'
import { normalizar } from './util'

/**
 * Carga inicial do link de teste. Os inputs vêm embutidos só na página publicada
 * (<script type="application/json" id="carga-inicial">), nunca no código-fonte:
 * o repositório é público e os inputs são do usuário.
 */

interface ItemCarga extends NovoInput {
  nota?: string
}

interface Carga {
  id: string
  inputs: ItemCarga[]
}

interface RegistroExemplos {
  inputs: string[]
  reunioes: string[]
}

let preparando: Promise<void> | null = null

export function prepararDadosIniciais(): Promise<void> {
  if (!EM_ARTIFACT) return Promise.resolve()
  preparando ??= preparar()
  return preparando
}

function lerCarga(): Carga | null {
  const el = document.getElementById('carga-inicial')
  if (!el?.textContent) return null
  try {
    const carga = JSON.parse(el.textContent) as Carga
    return carga.id && Array.isArray(carga.inputs) ? carga : null
  } catch {
    return null
  }
}

async function preparar() {
  await removerExemplosAntigos()
  const carga = lerCarga()
  if (!carga) return
  const chave = `carga:${carga.id}`
  if (await db.config.get(chave)) return
  await db.config.put({ chave, valor: true })

  // Não duplica o que a pessoa já tenha importado por conta própria
  const existentes = new Set((await db.inputs.toArray()).map((i) => normalizar(i.descricao)))
  const novos = carga.inputs.filter((i) => !existentes.has(normalizar(i.descricao)))
  const criados = await criarInputs(novos.map(({ nota: _nota, ...input }) => input))
  for (const [i, input] of criados.entries()) {
    const nota = novos[i].nota
    if (nota) await adicionarNota(input.id, nota)
  }
}

/** Remove os exemplos fictícios da primeira versão do link de teste, se ainda estiverem no navegador. */
async function removerExemplosAntigos() {
  const registro = (await db.config.get('exemplos'))?.valor as RegistroExemplos | undefined
  if (!registro) return
  await db.transaction('rw', [db.inputs, db.anexos, db.reunioes, db.audio, db.pessoas, db.config], async () => {
    const exemplos = await db.inputs.bulkGet(registro.inputs)
    await db.anexos.where('inputId').anyOf(registro.inputs).delete()
    await db.inputs.bulkDelete(registro.inputs)
    await db.audio.where('reuniaoId').anyOf(registro.reunioes).delete()
    await db.reunioes.bulkDelete(registro.reunioes)
    await db.config.delete('exemplos')
    const emUso = new Set((await db.inputs.toArray()).flatMap((i) => i.responsaveis))
    const soDosExemplos = new Set(exemplos.flatMap((i) => i?.responsaveis ?? []).filter((n) => !emUso.has(n)))
    await db.pessoas.filter((p) => soDosExemplos.has(p.nome)).delete()
  })
}
