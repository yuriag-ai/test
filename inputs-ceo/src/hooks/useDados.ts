import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { statusIA } from '../lib/api'
import { db } from '../lib/db'
import { AREAS_PADRAO, MARCAS_PADRAO } from '../lib/rotulos'

/** Listas editáveis (áreas, marcas) e nomes de pessoas para autocompletar. */
export function useListas() {
  const config = useLiveQuery(() => db.config.bulkGet(['areas', 'marcas']), [])
  const pessoas = useLiveQuery(() => db.pessoas.orderBy('nome').toArray(), []) ?? []
  const areas = (config?.[0]?.valor as string[] | undefined) ?? AREAS_PADRAO
  const marcas = (config?.[1]?.valor as string[] | undefined) ?? MARCAS_PADRAO
  return { areas, marcas, pessoas, nomes: pessoas.map((p) => p.nome) }
}

let cacheIA: Promise<boolean> | null = null

export function useIA(): boolean | null {
  const [ok, setOk] = useState<boolean | null>(null)
  useEffect(() => {
    cacheIA ??= statusIA()
    void cacheIA.then(setOk)
  }, [])
  return ok
}
