import { useCallback, useEffect, useRef, useState } from 'react'
import { db, salvarTrechoAudio } from '../lib/db'

// --- Tipos mínimos da Web Speech API (não fazem parte do lib DOM do TypeScript) ---
interface ResultadoFala {
  readonly isFinal: boolean
  readonly 0: { transcript: string }
}
interface EventoFala {
  readonly resultIndex: number
  readonly results: ArrayLike<ResultadoFala>
}
interface ReconhecedorFala {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: EventoFala) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}
type ConstrutorFala = new () => ReconhecedorFala

function construtorFala(): ConstrutorFala | null {
  const w = window as unknown as { SpeechRecognition?: ConstrutorFala; webkitSpeechRecognition?: ConstrutorFala }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const suportaTranscricao = typeof window !== 'undefined' && construtorFala() !== null
export const suportaGravacao =
  typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)

function melhorFormato(): string | undefined {
  const opcoes = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus']
  return opcoes.find((t) => MediaRecorder.isTypeSupported(t))
}

export type EstadoCaptura = 'parado' | 'gravando' | 'pausado'

export interface OpcoesCaptura {
  gravarAudio: boolean
  transcrever: boolean
}

/**
 * Captura de reunião pelo microfone do aparelho:
 * - grava o áudio em trechos de 5s direto no IndexedDB (não perde nada se o app fechar);
 * - transcreve ao vivo em pt-BR com o reconhecimento de voz do próprio navegador;
 * - mantém a tela ligada (Wake Lock) enquanto grava.
 */
export function useCaptura(aoTranscrever: (trecho: string) => void) {
  const [estado, setEstado] = useState<EstadoCaptura>('parado')
  const [segundos, setSegundos] = useState(0)
  const [interino, setInterino] = useState('')
  const [nivel, setNivel] = useState(0)
  const [aviso, setAviso] = useState<string | null>(null)

  const callback = useRef(aoTranscrever)
  callback.current = aoTranscrever

  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const fala = useRef<ReconhecedorFala | null>(null)
  const falaAtiva = useRef(false)
  const wakeLock = useRef<WakeLockSentinel | null>(null)
  const audioCtx = useRef<AudioContext | null>(null)
  const raf = useRef<number>(0)
  const ordem = useRef(0)
  const gravacoesPendentes = useRef<Promise<void>[]>([])
  const relogio = useRef<{ acumulado: number; inicio: number | null }>({ acumulado: 0, inicio: null })
  const formato = useRef<string | undefined>(undefined)

  // Relógio
  useEffect(() => {
    if (estado !== 'gravando') return
    const t = setInterval(() => {
      const r = relogio.current
      setSegundos(Math.floor((r.acumulado + (r.inicio ? Date.now() - r.inicio : 0)) / 1000))
    }, 500)
    return () => clearInterval(t)
  }, [estado])

  const pedirWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator && document.visibilityState === 'visible') {
        wakeLock.current = await navigator.wakeLock.request('screen')
      }
    } catch {
      // sem suporte ou negado: segue sem manter a tela ligada
    }
  }, [])

  useEffect(() => {
    const aoVoltar = () => {
      if (document.visibilityState === 'visible' && estado === 'gravando') void pedirWakeLock()
    }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => document.removeEventListener('visibilitychange', aoVoltar)
  }, [estado, pedirWakeLock])

  const iniciarFala = useCallback(() => {
    const Construtor = construtorFala()
    if (!Construtor) return
    const r = new Construtor()
    r.lang = 'pt-BR'
    r.continuous = true
    r.interimResults = true
    r.onresult = (e) => {
      let parcial = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        const texto = res[0].transcript.trim()
        if (!texto) continue
        if (res.isFinal) callback.current(texto)
        else parcial += `${texto} `
      }
      setInterino(parcial.trim())
    }
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        falaAtiva.current = false
        setAviso('A transcrição ao vivo foi bloqueada pelo navegador. O áudio continua sendo gravado.')
      } else if (e.error === 'audio-capture') {
        setAviso('O microfone está ocupado. Se a transcrição não aparecer, desligue "Gravar áudio" e tente de novo.')
      } else if (e.error === 'network') {
        setAviso('A transcrição ao vivo precisa de internet. O áudio continua sendo gravado.')
      }
    }
    // O navegador encerra o reconhecimento após silêncios: reinicia enquanto estiver gravando.
    r.onend = () => {
      setInterino('')
      if (falaAtiva.current) {
        try {
          r.start()
        } catch {
          setTimeout(() => falaAtiva.current && iniciarFala(), 300)
        }
      }
    }
    fala.current = r
    falaAtiva.current = true
    try {
      r.start()
    } catch {
      // já iniciado
    }
  }, [])

  const pararFala = useCallback(() => {
    falaAtiva.current = false
    fala.current?.stop()
    fala.current = null
    setInterino('')
  }, [])

  const medirNivel = useCallback((s: MediaStream) => {
    try {
      const ctx = new AudioContext()
      void ctx.resume()
      const analisador = ctx.createAnalyser()
      analisador.fftSize = 512
      ctx.createMediaStreamSource(s).connect(analisador)
      audioCtx.current = ctx
      const dados = new Uint8Array(analisador.fftSize)
      let ultimo = 0
      const passo = (t: number) => {
        analisador.getByteTimeDomainData(dados)
        if (t - ultimo > 90) {
          let soma = 0
          for (const v of dados) soma += ((v - 128) / 128) ** 2
          setNivel(Math.min(1, Math.sqrt(soma / dados.length) * 4))
          ultimo = t
        }
        raf.current = requestAnimationFrame(passo)
      }
      raf.current = requestAnimationFrame(passo)
    } catch {
      // medidor é só visual
    }
  }, [])

  const iniciar = useCallback(
    async (reuniaoId: string, opcoes: OpcoesCaptura) => {
      setAviso(null)
      // Continua a numeração se já houver trechos desta reunião (gravação interrompida)
      ordem.current = await db.audio.where('reuniaoId').equals(reuniaoId).count()
      gravacoesPendentes.current = []
      relogio.current = { acumulado: 0, inicio: Date.now() }
      setSegundos(0)

      if (opcoes.gravarAudio && suportaGravacao) {
        const s = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        })
        stream.current = s
        formato.current = melhorFormato()
        const rec = new MediaRecorder(s, { mimeType: formato.current, audioBitsPerSecond: 32_000 })
        rec.ondataavailable = (e) => {
          if (e.data.size > 0) gravacoesPendentes.current.push(salvarTrechoAudio(reuniaoId, ordem.current++, e.data))
        }
        rec.start(5000)
        recorder.current = rec
        medirNivel(s)
      }
      if (opcoes.transcrever && suportaTranscricao) iniciarFala()
      await pedirWakeLock()
      setEstado('gravando')
    },
    [iniciarFala, medirNivel, pedirWakeLock],
  )

  const pausar = useCallback(() => {
    recorder.current?.state === 'recording' && recorder.current.pause()
    const r = relogio.current
    if (r.inicio) r.acumulado += Date.now() - r.inicio
    r.inicio = null
    const transcrevendo = falaAtiva.current
    pararFala()
    falaAtiva.current = false
    setEstado('pausado')
    return transcrevendo
  }, [pararFala])

  const retomar = useCallback(
    (transcrever: boolean) => {
      recorder.current?.state === 'paused' && recorder.current.resume()
      relogio.current.inicio = Date.now()
      if (transcrever && suportaTranscricao) iniciarFala()
      setEstado('gravando')
    },
    [iniciarFala],
  )

  const liberar = useCallback(() => {
    cancelAnimationFrame(raf.current)
    void audioCtx.current?.close()
    audioCtx.current = null
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
    void wakeLock.current?.release()
    wakeLock.current = null
    setNivel(0)
  }, [])

  /** Encerra a captura e aguarda todos os trechos de áudio serem salvos. */
  const parar = useCallback(async (): Promise<{ duracaoSeg: number; audioTipo?: string }> => {
    pararFala()
    const r = relogio.current
    if (r.inicio) r.acumulado += Date.now() - r.inicio
    r.inicio = null
    const rec = recorder.current
    if (rec && rec.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        rec.addEventListener('stop', () => resolve(), { once: true })
        rec.stop()
      })
    }
    recorder.current = null
    await Promise.all(gravacoesPendentes.current)
    liberar()
    setEstado('parado')
    const duracaoSeg = Math.round(r.acumulado / 1000)
    setSegundos(duracaoSeg)
    return { duracaoSeg, audioTipo: rec ? formato.current || rec.mimeType : undefined }
  }, [liberar, pararFala])

  // Ao sair da tela, solta microfone e wake lock
  useEffect(
    () => () => {
      falaAtiva.current = false
      fala.current?.abort()
      if (recorder.current?.state !== 'inactive') recorder.current?.stop()
      liberar()
    },
    [liberar],
  )

  return { estado, segundos, interino, nivel, aviso, iniciar, pausar, retomar, parar }
}
