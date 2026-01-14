# 🚀 Guia Rápido de Deploy - TreinaÍ

## ✅ Servidor Local (DISPONÍVEL AGORA!)

O aplicativo está rodando localmente em:
- **URL:** http://localhost:8080
- Para parar o servidor: `pkill -f "python3 -m http.server 8080"`

## 🌐 Opções de Deploy Online (Escolha uma)

### Opção 1: Netlify Drop (MAIS RÁPIDO - 2 minutos)

1. Acesse: https://app.netlify.com/drop
2. Arraste a pasta `dist/` para a área de upload
3. Pronto! Você receberá uma URL como: `https://random-name.netlify.app`

**Vantagens:**
- ✅ Sem conta necessária
- ✅ Deploy instantâneo
- ✅ SSL gratuito
- ✅ URL pública imediata

### Opção 2: Vercel via GitHub (3-5 minutos)

1. Acesse: https://vercel.com/new
2. Conecte sua conta GitHub
3. Selecione o repositório `yuriag-ai/test`
4. Configure:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Adicione variáveis de ambiente (se necessário):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Clique em "Deploy"

**Vantagens:**
- ✅ Deploy automático a cada push
- ✅ Preview de PRs
- ✅ Analytics incluído

### Opção 3: Netlify via GitHub (3-5 minutos)

1. Acesse: https://app.netlify.com/start
2. Conecte sua conta GitHub
3. Selecione o repositório `yuriag-ai/test`
4. Configure:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Adicione variáveis de ambiente (Menu: Site settings → Environment variables)
6. Clique em "Deploy site"

### Opção 4: Render.com (5-10 minutos)

1. Acesse: https://dashboard.render.com/
2. Clique em "New +" → "Static Site"
3. Conecte seu repositório GitHub
4. Configure:
   - **Build Command:** `npm install --legacy-peer-deps && npm run build`
   - **Publish Directory:** `dist`
5. Clique em "Create Static Site"

**Arquivo de configuração já incluído:** `render.yaml`

### Opção 5: GitHub Pages (via Actions)

1. No GitHub, vá em: Settings → Pages
2. Source: "GitHub Actions"
3. O workflow já está configurado em `.github/workflows/deploy.yml`
4. Faça push para a branch e aguarde o deploy

**URL será:** `https://<seu-usuario>.github.io/<nome-repo>/`

## 📋 Checklist Pré-Deploy

- [x] Build funcionando (`npm run build`)
- [x] Dist folder gerado
- [x] Configurações de deploy criadas (vercel.json, netlify.toml, render.yaml)
- [ ] Variáveis de ambiente configuradas no Supabase
- [ ] URL base atualizada nas configurações

## 🔐 Variáveis de Ambiente Necessárias

Para que o aplicativo funcione completamente online, você precisará:

1. Criar um projeto no Supabase: https://supabase.com
2. Executar os scripts SQL:
   - `database_schema.sql`
   - `database_schema_v2.sql`
3. Adicionar as variáveis no serviço de hospedagem:
   ```
   VITE_SUPABASE_URL=sua_url_do_supabase
   VITE_SUPABASE_ANON_KEY=sua_chave_anonima
   ```

## 🎯 Recomendação

Para **teste rápido da UI/UX:**
- Use o servidor local (http://localhost:8080) ou Netlify Drop

Para **deploy permanente com CI/CD:**
- Use Vercel ou Netlify com GitHub

## 💡 Problemas Comuns

**Build falha:**
- Certifique-se de usar `--legacy-peer-deps` durante install
- Use Node.js versão 18 ou superior

**Rotas não funcionam (404):**
- Verifique se o arquivo de configuração está presente (vercel.json ou netlify.toml)
- Certifique-se que as rewrites estão configuradas

**Supabase não conecta:**
- Verifique se as variáveis de ambiente estão corretas
- Confirme que as tabelas foram criadas no banco de dados
- Verifique as políticas RLS no Supabase
