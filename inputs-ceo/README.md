# Inputs CEO · Arezzo&CO

Plataforma mobile (PWA) para o escritório do CEO organizar os inputs do Alexandre Birman como tarefas acompanháveis: onde foi falado, contexto, responsável, prazo, status, observações e anexos.

Formas de registrar inputs:

1. **Importar** (botão central) — envie o material gravado ou anotado em outra ferramenta e o app transforma em inputs revisáveis:
   - **Transcrição** (Teams, Zoom, Meet, Plaud, Otter, gravador do celular): `.txt`, `.docx`, `.pdf`, legendas `.srt`/`.vtt` ou texto colado. Nomes de quem fala e marcações de tempo são aproveitados.
   - **Resumo / ata pronta** gerada por outra ferramenta ou escrita por alguém — inclusive em inglês.
   - **Lista de tarefas** no formato usado hoje (veja abaixo) ou checklist (`- [ ]`, `- [x]`).
   - **Foto** de caderno, quadro ou print de conversa (lida pela IA).

   O tipo de material é detectado automaticamente (dá para trocar). Você escolhe gerar **só o plano de ação** ou **ata executiva + plano**. A IA também extrai título, data, local e participantes quando constam no material.
2. **Gravar no celular** — o microfone capta a conversa, transcreve ao vivo e gera a ata/plano ao final.
3. **Manual** — botão `+` na lista.

Formato de lista reconhecido mesmo sem IA:
- `Nome: pedido`, `pedido | Nome`, `Responsável: Nome`, `@nome`, `Fulano vai…/ficou de…`, `puxar com Fulano`, `| Para o time de X` → responsável
- `Enviado.`, `Enviado pela Ana.`, `Em andamento.`, `[x]` → status
- `03.11`, `08/11`, `até sexta`, `amanhã`, `até dia 15` → prazo; marcas e áreas são reconhecidas pelo texto

Sem a IA configurada, o app lê listas e as seções de "próximos passos / ações / encaminhamentos" de resumos; transcrições completas, PDFs e fotos precisam da IA.

### Revisor de inputs

Nada vira tarefa sem revisão. No revisor:
- **Filtros de atenção:** precisam de atenção, sem responsável, sem prazo, repetidos.
- **Repetidos:** se uma ação parece um input que já existe, dá para **atualizar o existente** (vira uma anotação "Retomado…" no histórico, e status/prazo/responsável são completados) em vez de duplicar. Itens repetidos dentro da mesma lista podem ser **juntados**.
- **Nomes novos:** responsáveis fora do cadastro aparecem marcados, com sugestão de quem já existe ("Pri" → "Priscila …").
- **Editar várias:** selecione itens e aplique responsável, área, marca, prazo, prioridade ou status de uma vez.
- **Trecho de origem** de cada ação, **material original** sempre à mão, adicionar/duplicar/remover itens.
- **Rascunho salvo:** se sair no meio da revisão, ela é restaurada ao voltar.
- Ao salvar uma transcrição ou resumo, a reunião (com a ata, se gerada) fica em **Reuniões**, incluindo os inputs retomados.

## Funcionalidades

| Tela | O que faz |
|---|---|
| **Inputs** | Lista com busca, filtros rápidos (abertos, atrasados, sem responsável, em andamento, realizados), filtros por área/marca/responsável/origem, agrupamento (área, responsável, status, marca, data) e troca de status com um toque. Exporta para Excel (CSV). |
| **Detalhe do input** | Todos os campos editáveis, histórico de atualizações (mudanças de status registradas automaticamente), anexos (foto pela câmera, PDF, planilha etc.) e link para a reunião de origem. |
| **Importar** | Arquivo, foto ou texto colado → detecção do tipo → interpretação (IA ou local) → revisor de inputs. |
| **Gravar** | Transcrição ao vivo, gravação do áudio em trechos salvos no aparelho (não se perde se o app fechar), pausa, "Destacar" momentos importantes, anotações digitadas durante a reunião e tela sempre ligada (Wake Lock). |
| **Reuniões** | Atas executivas (resumo, temas, decisões, pontos de atenção, plano de ação), áudio, transcrição completa, compartilhar texto e imprimir/salvar PDF. |
| **Pessoas** | Quem está com o quê, quantos itens abertos/atrasados e botão para pedir status por WhatsApp com a lista de pendências pronta. |
| **Ajustes** | Listas de áreas, marcas e pessoas editáveis; backup/restauração; exportação. |

## Rodando localmente

```bash
cd inputs-ceo
npm install
cp .env.example .env.local   # coloque sua ANTHROPIC_API_KEY
npm run dev                  # http://localhost:5174 (também acessível pela rede local)
```

Sem a chave, tudo funciona exceto a geração de Ata/Plano de Ação e o refinamento de listas pela IA.

Para testar no celular, o microfone exige **HTTPS** — use o deploy (abaixo) ou um túnel como `npx localtunnel --port 5174`.

```bash
npm test          # importador, leitura de materiais, repetidos e contrato com a API do Claude
npm run build     # typecheck + build de produção
```

## Deploy (Vercel)

1. Importe o repositório na Vercel e defina **Root Directory = `inputs-ceo`**.
2. Em *Environment Variables*, crie `ANTHROPIC_API_KEY` (opcional: `CLAUDE_MODEL`).
3. Deploy. As funções em `api/` rodam no servidor; a chave nunca vai para o navegador. O tempo máximo da função está em 300 s (`vercel.json`) para reuniões longas — confira o limite do seu plano.
4. No celular, abra o link e use **"Adicionar à Tela de Início"** para instalar como app.

## Arquitetura

```
inputs-ceo/
├── api/                 # Funções serverless (Vercel): /api/processar e /api/status
├── server/processar.ts  # Chamada ao Claude com saída estruturada (JSON validado com Zod)
├── src/
│   ├── hooks/useCaptura.ts   # Microfone: MediaRecorder + reconhecimento de voz + Wake Lock
│   ├── lib/db.ts             # Banco local (IndexedDB via Dexie): inputs, anexos, reuniões, áudio
│   ├── lib/importador.ts     # Interpretação local das listas de inputs (sem IA)
│   ├── lib/material.ts       # Detecção do tipo de material, legendas SRT/VTT, seções de ações
│   ├── lib/arquivos.ts       # Leitura de TXT/DOCX/PDF/fotos no navegador
│   ├── lib/similaridade.ts   # Repetidos e sugestão de nomes no revisor
│   └── pages/                # Telas
└── tests/
```

- **IA:** Claude (`claude-opus-5-5`) com pensamento adaptativo e saída estruturada; o servidor valida o JSON antes de devolver. Recusas e respostas cortadas viram mensagens claras para o usuário.
- **Dados:** nesta primeira versão ficam **no próprio aparelho** (IndexedDB). O texto da reunião só sai do celular quando você pede para gerar a ata/plano. Use *Ajustes → Exportar backup* periodicamente.

## Limitações conhecidas desta versão

- **Transcrição ao vivo** usa o reconhecimento de voz do navegador: funciona melhor no **Chrome (Android)**; no iPhone, use o Safari. Precisa de internet e não identifica quem falou. O áudio é gravado à parte e pode ser ouvido depois.
- **Tela bloqueada:** no iPhone, a gravação para se a tela bloquear ou o app for para segundo plano. O app pede para manter a tela ligada, mas o ideal é deixar o celular desbloqueado sobre a mesa.
- **Um aparelho só:** ainda não há login nem sincronização entre pessoas.
- **Tamanho dos arquivos:** PDFs e fotos são enviados à IA junto com o pedido; o total por envio fica em ~3,5 MB (limite das funções da Vercel). Arquivos `.doc` antigos, `.pages` e áudio não são lidos — exporte como DOCX, PDF ou TXT.

## Próximas etapas sugeridas

1. **Multiusuário e sincronização** (Supabase: login, banco Postgres e storage para anexos/áudio), para o time ver e atualizar os próprios itens.
2. **Transcrição de alta qualidade a partir do áudio** (para quem preferir subir o áudio em vez da transcrição) (com separação de quem falou). A API do Claude não recebe áudio, então essa etapa precisa de um serviço de transcrição dedicado, a escolher.
3. **App nativo** (React Native/Expo) para gravar com a tela bloqueada.
4. Lembretes automáticos de prazo e resumo semanal por responsável (e-mail/WhatsApp).
