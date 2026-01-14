# 🚀 Deploy da TreinaÍ

## Opção 1: Deploy no Vercel (Recomendado) ⚡

### Via Interface Web (Mais Fácil)

1. **Crie uma conta no Vercel**
   - Acesse: https://vercel.com/signup
   - Faça login com GitHub

2. **Conecte o Repositório**
   - Clique em "Add New" > "Project"
   - Importe o repositório do GitHub
   - Selecione o repositório `yuriag-ai/test`

3. **Configure as Variáveis de Ambiente**
   - Na seção "Environment Variables", adicione:
     - `VITE_SUPABASE_URL` = sua URL do Supabase
     - `VITE_SUPABASE_ANON_KEY` = sua chave anon do Supabase

4. **Deploy!**
   - Clique em "Deploy"
   - Aguarde 2-3 minutos
   - Sua URL será: `https://treinai-[hash].vercel.app`

### Via CLI (Mais Rápido)

```bash
# 1. Instale o Vercel CLI
npm install -g vercel

# 2. Faça login
vercel login

# 3. Deploy!
vercel

# Siga as instruções:
# - Set up and deploy? Yes
# - Which scope? Sua conta
# - Link to existing project? No
# - Project name? treinai
# - Directory? ./
# - Override settings? No

# 4. Adicione as variáveis de ambiente
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# 5. Deploy para produção
vercel --prod
```

---

## Opção 2: Deploy no Netlify

```bash
# 1. Instale o Netlify CLI
npm install -g netlify-cli

# 2. Faça login
netlify login

# 3. Build do projeto
npm run build

# 4. Deploy
netlify deploy --prod --dir=dist

# 5. Configure as variáveis no dashboard
# Vá para: Site settings > Environment variables
```

**Netlify Config** (já incluído em `netlify.toml`):
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## Opção 3: Deploy no GitHub Pages

```bash
# 1. Instale gh-pages
npm install --save-dev gh-pages

# 2. Adicione ao package.json:
"scripts": {
  "predeploy": "npm run build",
  "deploy": "gh-pages -d dist"
}

# 3. Configure o base no vite.config.ts:
export default defineConfig({
  base: '/nome-do-repo/',
  // ...
})

# 4. Deploy
npm run deploy
```

**URL:** `https://yuriag-ai.github.io/test/`

---

## Opção 4: Deploy no Render

1. Acesse: https://render.com
2. Conecte o GitHub
3. New > Static Site
4. Configure:
   - Build Command: `npm run build`
   - Publish Directory: `dist`
5. Adicione variáveis de ambiente
6. Deploy!

---

## ⚙️ Configuração do Supabase

Antes de fazer deploy, configure o Supabase:

### 1. Execute o Schema
```sql
-- No Supabase SQL Editor, execute:
-- database_schema.sql (schema básico)
-- database_schema_v2.sql (features avançadas)
```

### 2. Configure as Variáveis
Pegue suas credenciais em: `Supabase > Settings > API`

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
```

### 3. Configure CORS (se necessário)
No Supabase, em `Authentication > URL Configuration`:
- Adicione sua URL do Vercel
- Ex: `https://treinai-xxx.vercel.app`

---

## 🧪 Teste Local Antes do Deploy

```bash
# 1. Build de produção
npm run build

# 2. Preview local
npm run preview

# 3. Teste a build
# Abra http://localhost:4173
```

---

## 🎨 Personalize o Domínio (Opcional)

### Vercel
1. Vá em: Project Settings > Domains
2. Adicione seu domínio customizado
3. Configure os DNS conforme instruções

### Netlify
1. Vá em: Domain settings > Add custom domain
2. Siga as instruções de DNS

---

## 📊 Monitoramento

### Analytics (Opcional)

**Google Analytics:**
```typescript
// Em src/main.tsx
import ReactGA from 'react-ga4';

ReactGA.initialize('G-XXXXXXXXXX');
```

**Vercel Analytics:**
```bash
npm install @vercel/analytics
```

```typescript
// Em src/main.tsx
import { Analytics } from '@vercel/analytics/react';

<Analytics />
```

---

## 🔧 Troubleshooting

### Erro: "Environment variables not found"
- Adicione as variáveis no dashboard do Vercel/Netlify
- Faça redeploy após adicionar

### Erro: "404 on refresh"
- Verifique se o `vercel.json` tem o rewrite correto
- Para Netlify, use o `_redirects` ou `netlify.toml`

### Erro: "Supabase connection failed"
- Verifique se as URLs estão corretas
- Confirme que o CORS está configurado no Supabase

### Build muito grande
```bash
# Otimize as imagens
# Use lazy loading
# Code splitting automático do Vite
```

---

## 🚀 Deploy Automático

Configure CI/CD para deploy automático a cada push:

### GitHub Actions (Vercel)

Crie `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

---

## 📝 Checklist Pré-Deploy

- [ ] Código commitado e pushed
- [ ] Build local testado (`npm run build`)
- [ ] Variáveis de ambiente configuradas
- [ ] Schema do Supabase executado
- [ ] CORS configurado no Supabase
- [ ] Testes básicos realizados
- [ ] README atualizado com URL de produção

---

## 🎉 Pronto!

Após o deploy, você terá:

✅ App rodando em HTTPS
✅ SSL automático
✅ CI/CD configurado
✅ PWA funcionando
✅ Performance otimizada

**URLs de Exemplo:**
- Vercel: `https://treinai-xxx.vercel.app`
- Netlify: `https://treinai-xxx.netlify.app`
- Render: `https://treinai-xxx.onrender.com`

---

## 📞 Suporte

Se tiver problemas:
1. Confira os logs de build no dashboard
2. Verifique as variáveis de ambiente
3. Teste localmente com `npm run preview`
4. Consulte a documentação oficial

**Boa sorte com o deploy! 🚀**
