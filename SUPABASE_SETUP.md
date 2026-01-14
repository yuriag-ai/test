# 🚀 Guia Completo: Configurar Supabase para TreinaÍ

## 📋 Índice
1. [Criar Conta e Projeto](#1-criar-conta-e-projeto)
2. [Executar Scripts SQL](#2-executar-scripts-sql)
3. [Configurar Autenticação](#3-configurar-autenticação)
4. [Obter Credenciais](#4-obter-credenciais)
5. [Configurar Variáveis de Ambiente](#5-configurar-variáveis-de-ambiente)
6. [Testar Conexão](#6-testar-conexão)

---

## 1. Criar Conta e Projeto

### Passo 1.1: Criar Conta no Supabase
1. Acesse: **https://supabase.com**
2. Clique em **"Start your project"**
3. Faça login com:
   - GitHub (recomendado)
   - Google
   - Email

### Passo 1.2: Criar Novo Projeto
1. No dashboard, clique em **"New Project"**
2. Preencha os dados:
   - **Name:** `treinai` (ou nome de sua preferência)
   - **Database Password:** Crie uma senha forte (GUARDE ESTA SENHA!)
   - **Region:** Escolha a região mais próxima (ex: `South America (São Paulo)`)
   - **Pricing Plan:** `Free` (0$/mês - suficiente para testes)

3. Clique em **"Create new project"**
4. ⏱️ Aguarde 2-3 minutos enquanto o projeto é provisionado

---

## 2. Executar Scripts SQL

### Passo 2.1: Acessar o SQL Editor
1. No menu lateral, clique em **"SQL Editor"** (ícone de banco de dados)
2. Clique em **"New Query"**

### Passo 2.2: Executar Schema Principal
1. Copie TODO o conteúdo do arquivo **`database_schema.sql`**
2. Cole no SQL Editor
3. Clique em **"Run"** (ou pressione Ctrl+Enter)
4. ✅ Verifique se aparece "Success. No rows returned"

<details>
<summary>📄 Ver database_schema.sql</summary>

```sql
-- Este é o schema principal com 4 tabelas base
-- profiles, workouts, workout_exercises, user_preferences
```

Arquivo completo está em: `/home/user/test/database_schema.sql`
</details>

### Passo 2.3: Executar Schema v2 (Features Premium)
1. Clique em **"New Query"** novamente
2. Copie TODO o conteúdo do arquivo **`database_schema_v2.sql`**
3. Cole no SQL Editor
4. Clique em **"Run"**
5. ✅ Verifique se todas as 12 novas tabelas foram criadas

<details>
<summary>📄 Ver database_schema_v2.sql</summary>

```sql
-- Este schema adiciona 12 tabelas para features premium:
-- workout_history, achievements, challenges, user_challenge_progress,
-- community_posts, post_likes, post_comments, notifications,
-- workout_reminders, subscriptions, exercise_videos, user_stats
```

Arquivo completo está em: `/home/user/test/database_schema_v2.sql`
</details>

### Passo 2.4: Verificar Tabelas Criadas
1. No menu lateral, clique em **"Table Editor"**
2. Você deve ver 16 tabelas:

**Tabelas Base (4):**
- ✅ profiles
- ✅ workouts
- ✅ workout_exercises
- ✅ user_preferences

**Tabelas Premium (12):**
- ✅ workout_history
- ✅ achievements
- ✅ challenges
- ✅ user_challenge_progress
- ✅ community_posts
- ✅ post_likes
- ✅ post_comments
- ✅ notifications
- ✅ workout_reminders
- ✅ subscriptions
- ✅ exercise_videos
- ✅ user_stats

---

## 3. Configurar Autenticação

### Passo 3.1: Ativar Provedores de Login
1. No menu lateral, clique em **"Authentication"**
2. Clique em **"Providers"**

### Passo 3.2: Configurar Email/Password (Obrigatório)
1. Localize **"Email"**
2. Verifique se está **HABILITADO** (toggle verde)
3. Configure:
   - ✅ **Enable Email provider:** ON
   - ✅ **Confirm email:** OFF (para testes) ou ON (para produção)
   - ✅ **Secure email change:** ON
4. Clique em **"Save"**

### Passo 3.3: Configurar Redirect URLs
1. No menu lateral, vá em **"Authentication" → "URL Configuration"**
2. Adicione as URLs permitidas:

**Para desenvolvimento local:**
```
http://localhost:5173
http://localhost:8080
```

**Para produção (adicione quando tiver a URL):**
```
https://seu-dominio.com
https://seu-site.netlify.app
```

3. Clique em **"Save"**

### Passo 3.4: Configurar Email Templates (Opcional)
1. Vá em **"Authentication" → "Email Templates"**
2. Personalize os templates:
   - **Confirm signup:** Email de confirmação
   - **Magic Link:** Link mágico para login
   - **Reset Password:** Recuperação de senha

---

## 4. Obter Credenciais

### Passo 4.1: Acessar API Settings
1. No menu lateral, clique no ícone de **engrenagem** (Settings)
2. Clique em **"API"**

### Passo 4.2: Copiar Credenciais

Você verá duas informações importantes:

#### 🔑 Project URL
```
https://xxxxxxxxxxxxxxxx.supabase.co
```
**📋 Copie este valor** - será sua `VITE_SUPABASE_URL`

#### 🔑 Project API Keys

Você verá duas chaves:

**anon public (Chave Pública)**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
**📋 Copie este valor** - será sua `VITE_SUPABASE_ANON_KEY`

⚠️ **IMPORTANTE:**
- ✅ Use a chave **`anon`** (pública) no frontend
- ❌ NUNCA use a chave **`service_role`** no frontend
- 🔒 A chave `service_role` deve ser mantida em segredo

---

## 5. Configurar Variáveis de Ambiente

### Passo 5.1: Criar Arquivo .env.local (Desenvolvimento Local)

1. Na raiz do projeto, crie o arquivo `.env.local`:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

2. Substitua pelos valores que você copiou no passo anterior

3. ⚠️ **IMPORTANTE:** Este arquivo NÃO deve ser commitado no Git
   - Verifique se `.env.local` está no `.gitignore`

### Passo 5.2: Configurar em Produção

Dependendo da plataforma de deploy, configure as variáveis:

#### **Netlify:**
1. Dashboard → Site settings → Environment variables
2. Adicione:
   - Key: `VITE_SUPABASE_URL` | Value: `sua-url`
   - Key: `VITE_SUPABASE_ANON_KEY` | Value: `sua-chave`

#### **Vercel:**
1. Project Settings → Environment Variables
2. Adicione as mesmas variáveis acima

#### **Render:**
1. Dashboard → Environment
2. Adicione as variáveis

---

## 6. Testar Conexão

### Passo 6.1: Reiniciar Servidor de Desenvolvimento
```bash
# Parar servidor atual
pkill -f "python3 -m http.server"

# Ou parar o Vite se estiver rodando
# Ctrl+C no terminal

# Iniciar servidor Vite com variáveis de ambiente
npm run dev
```

### Passo 6.2: Testar Cadastro
1. Acesse: http://localhost:5173
2. Clique em **"Começar Agora"**
3. Tente criar uma conta:
   - Nome completo
   - Email
   - Senha

### Passo 6.3: Verificar no Supabase
1. Volte ao dashboard do Supabase
2. Vá em **"Authentication" → "Users"**
3. ✅ Você deve ver o usuário criado

### Passo 6.4: Verificar Tabelas
1. Vá em **"Table Editor" → "profiles"**
2. ✅ Deve haver um registro com os dados do usuário

---

## 🎯 Checklist de Verificação

Marque conforme for completando:

- [ ] Conta no Supabase criada
- [ ] Projeto criado e provisionado
- [ ] `database_schema.sql` executado com sucesso
- [ ] `database_schema_v2.sql` executado com sucesso
- [ ] 16 tabelas visíveis no Table Editor
- [ ] Email/Password authentication habilitado
- [ ] Redirect URLs configuradas
- [ ] Project URL copiada
- [ ] Anon Key copiada
- [ ] `.env.local` criado e configurado
- [ ] Servidor reiniciado
- [ ] Cadastro de usuário testado
- [ ] Usuário aparece em Authentication → Users
- [ ] Profile criado automaticamente na tabela profiles

---

## 🔧 Troubleshooting

### Erro: "Invalid API key"
- ✅ Verifique se copiou a chave `anon` (não a `service_role`)
- ✅ Verifique se não há espaços extras na chave
- ✅ Reinicie o servidor após adicionar as variáveis

### Erro: "Failed to fetch"
- ✅ Verifique a URL do projeto (deve terminar com `.supabase.co`)
- ✅ Verifique sua conexão com internet
- ✅ Confirme que o projeto Supabase está ativo (não pausado)

### Erro ao executar SQL
- ✅ Execute os scripts em ordem (primeiro `database_schema.sql`, depois `database_schema_v2.sql`)
- ✅ Se der erro, delete as tabelas e execute novamente
- ✅ Verifique se copiou TODO o conteúdo do arquivo

### Usuário não aparece na tabela profiles
- ✅ Verifique se o trigger `on_auth_user_created` foi criado
- ✅ Tente criar um novo usuário
- ✅ Verifique os logs em Database → Logs

### Redirect não funciona após login
- ✅ Adicione sua URL em Authentication → URL Configuration
- ✅ Inclua tanto `http://localhost:5173` quanto `http://localhost:8080`

---

## 📚 Recursos Úteis

- **Documentação Supabase:** https://supabase.com/docs
- **Supabase Auth Guide:** https://supabase.com/docs/guides/auth
- **RLS Policies:** https://supabase.com/docs/guides/auth/row-level-security
- **Dashboard Supabase:** https://app.supabase.com

---

## 🎉 Próximos Passos

Depois de configurar o Supabase:

1. ✅ Teste todas as funcionalidades do app
2. 📤 Faça deploy em produção (Netlify Drop)
3. 🔐 Configure as variáveis de ambiente na plataforma de deploy
4. 🎨 Personalize o design conforme necessário
5. 📊 Monitore o uso no dashboard do Supabase

---

## 💡 Dicas de Produção

**Antes de lançar para usuários reais:**

1. **Ative confirmação de email:**
   - Authentication → Providers → Email → Confirm email: ON

2. **Configure limites de taxa (Rate Limiting):**
   - Authentication → Settings → Rate Limits

3. **Monitore o uso:**
   - Dashboard → Usage
   - Free tier: 500 MB database, 2 GB bandwidth, 50k autenticações

4. **Backup do banco:**
   - Database → Backups
   - Configure backups automáticos (plano Pro)

5. **Revise políticas RLS:**
   - Certifique-se que os usuários só acessam seus próprios dados
   - Database → Policies

---

**Precisa de ajuda? Deixe o Supabase dashboard aberto e me avise se encontrar algum erro!** 🚀
