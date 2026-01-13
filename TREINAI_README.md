# 🏋️ TreinaÍ - Plataforma de Treinos com IA

**Tagline:** "Seu treino. Sua inteligência."

Uma aplicação web moderna e responsiva focada no público brasileiro iniciante em exercícios físicos. A plataforma oferece geração de treinos personalizados impulsionada por inteligência artificial, com suporte completo para Português (PT-BR) e Inglês (EN).

## ✨ Características

- 🌍 **Bilíngue**: Suporte completo para PT-BR e EN com i18next
- 🎨 **Design moderno**: Interface clean e energética com Tailwind CSS
- 🔐 **Autenticação**: Sistema completo de login/signup com Supabase
- 🤖 **IA Personalizada**: Gerador de treinos baseado no perfil do usuário
- 📱 **Responsivo**: Mobile-first design
- 🎯 **Foco em iniciantes**: Interface acolhedora e sem julgamentos

## 🛠️ Stack Técnica

- **Frontend**: React 18 + TypeScript
- **Estilização**: Tailwind CSS
- **Componentes**: UI components customizados (inspirados em Shadcn/ui)
- **Roteamento**: React Router v6
- **Internacionalização**: i18next + react-i18next
- **Backend**: Supabase (Auth + Database)
- **Ícones**: Lucide React

## 🚀 Getting Started

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta no Supabase (gratuita)

### 1. Instalação

```bash
# Clone o repositório
git clone <seu-repositorio>
cd test

# Instale as dependências
npm install
```

### 2. Configuração do Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. Vá em `Settings > API` e copie:
   - `Project URL`
   - `anon/public key`

3. Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=sua_url_aqui
VITE_SUPABASE_ANON_KEY=sua_chave_aqui
```

### 3. Criar o Schema do Banco de Dados

No Supabase, vá em `SQL Editor` e execute o script em `database_schema.sql` (arquivo incluído no projeto).

Ou copie e execute este SQL:

```sql
-- Habilitar extensões
create extension if not exists "uuid-ossp";

-- Profiles (extends auth.users)
create table profiles (
  id uuid references auth.users primary key,
  name text,
  avatar_url text,
  preferred_language text default 'pt-BR',
  created_at timestamp with time zone default now()
);

-- User fitness profiles
create table fitness_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  age integer,
  gender text,
  weight numeric,
  weight_unit text default 'kg',
  height numeric,
  height_unit text default 'cm',
  fitness_level text,
  primary_goal text,
  available_equipment text[],
  preferred_duration integer,
  days_per_week integer,
  limitations text,
  updated_at timestamp with time zone default now()
);

-- Workouts
create table workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  name text,
  goal text,
  level text,
  duration_minutes integer,
  equipment_needed text[],
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Exercises in workouts
create table workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid references workouts(id) on delete cascade,
  exercise_name text,
  sets integer,
  reps integer,
  duration_seconds integer,
  rest_seconds integer,
  order_index integer,
  muscle_groups text[],
  difficulty text,
  instructions text,
  beginner_tip text,
  created_at timestamp with time zone default now()
);

-- Enable RLS (Row Level Security)
alter table profiles enable row level security;
alter table fitness_profiles enable row level security;
alter table workouts enable row level security;
alter table workout_exercises enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone"
  on profiles for select
  using (true);

create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- Fitness profiles policies
create policy "Users can view own fitness profile"
  on fitness_profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own fitness profile"
  on fitness_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own fitness profile"
  on fitness_profiles for update
  using (auth.uid() = user_id);

-- Workouts policies
create policy "Users can view own workouts"
  on workouts for select
  using (auth.uid() = user_id);

create policy "Users can create own workouts"
  on workouts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own workouts"
  on workouts for update
  using (auth.uid() = user_id);

create policy "Users can delete own workouts"
  on workouts for delete
  using (auth.uid() = user_id);

-- Workout exercises policies
create policy "Users can view exercises from own workouts"
  on workout_exercises for select
  using (
    exists (
      select 1 from workouts
      where workouts.id = workout_exercises.workout_id
      and workouts.user_id = auth.uid()
    )
  );

create policy "Users can insert exercises into own workouts"
  on workout_exercises for insert
  with check (
    exists (
      select 1 from workouts
      where workouts.id = workout_exercises.workout_id
      and workouts.user_id = auth.uid()
    )
  );

create policy "Users can update exercises in own workouts"
  on workout_exercises for update
  using (
    exists (
      select 1 from workouts
      where workouts.id = workout_exercises.workout_id
      and workouts.user_id = auth.uid()
    )
  );

create policy "Users can delete exercises from own workouts"
  on workout_exercises for delete
  using (
    exists (
      select 1 from workouts
      where workouts.id = workout_exercises.workout_id
      and workouts.user_id = auth.uid()
    )
  );

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### 4. Executar o Projeto

```bash
npm run dev
```

O projeto estará disponível em `http://localhost:5173`

## 📂 Estrutura do Projeto

```
src/
├── components/
│   ├── ui/              # Componentes UI reutilizáveis
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Card.tsx
│   └── layout/          # Componentes de layout
│       ├── Header.tsx
│       ├── Footer.tsx
│       └── LanguageSwitcher.tsx
├── contexts/
│   └── AuthContext.tsx  # Contexto de autenticação
├── lib/
│   ├── supabase.ts      # Cliente Supabase
│   └── utils.ts         # Utilitários
├── locales/             # Arquivos de tradução
│   ├── pt-BR/
│   │   ├── common.json
│   │   ├── home.json
│   │   ├── auth.json
│   │   ├── generator.json
│   │   └── workout.json
│   └── en/
│       └── ...
├── pages/
│   ├── Home.tsx         # Landing page
│   ├── Auth.tsx         # Login/Signup
│   ├── WorkoutGenerator.tsx  # Wizard de geração
│   ├── WorkoutView.tsx  # Visualização de treino
│   └── Dashboard.tsx    # Dashboard de treinos
├── types/
│   ├── database.ts      # Tipos do Supabase
│   └── index.ts         # Tipos gerais
├── App.tsx              # Componente principal com rotas
├── main.tsx             # Entry point
├── i18n.ts              # Configuração i18n
└── index.css            # Estilos globais
```

## 🎨 Paleta de Cores

A identidade visual usa as seguintes cores (definidas em CSS variables):

- **Laranja Energia**: `#FF6B35` - Cor primária energética
- **Navy Confiança**: `#1A1A2E` - Cor de confiança e seriedade
- **Verde Progresso**: `#16DB93` - Acento para progresso e sucesso
- **Neutros**: Cinzas e brancos para equilíbrio

## 🌍 Internacionalização

O projeto usa i18next com suporte completo para:
- 🇧🇷 Português (PT-BR) - Idioma principal
- 🇺🇸 Inglês (EN) - Idioma secundário

Para adicionar novas traduções, edite os arquivos em `src/locales/`.

## 📱 Páginas

### 1. Home (`/`)
Landing page com:
- Hero section
- Como funciona (3 passos)
- Recursos para iniciantes
- Depoimentos
- CTA final

### 2. Auth (`/auth`)
- Login e Cadastro em abas
- Integração com Supabase Auth
- Validação de formulários

### 3. Gerador de Treinos (`/gerar-treino`) 🔒
Wizard multi-step com 4 etapas:
1. Dados pessoais (idade, peso, altura, gênero)
2. Nível e objetivo fitness
3. Rotina (equipamentos, duração, frequência)
4. Revisão e geração

### 4. Visualização de Treino (`/treino/:id`) 🔒
- Detalhes completos do treino
- Lista de exercícios com instruções
- Dicas para iniciantes
- Ações (editar, deletar, iniciar)

### 5. Dashboard (`/meus-treinos`) 🔒
- Estatísticas do usuário
- Grid de todos os treinos salvos
- Ações rápidas

🔒 = Rota protegida (requer autenticação)

## 🔐 Autenticação

O sistema de autenticação usa Supabase Auth com:
- Email/Password signup e login
- Sessões persistentes
- Row Level Security (RLS) no banco
- Rotas protegidas com React Router

## 🎯 Próximos Passos

Para tornar a plataforma ainda melhor:

1. **Integração com IA real**: Conectar com OpenAI/Claude API para gerar treinos personalizados
2. **Modo treino**: Timer e progresso durante execução
3. **Histórico**: Rastreamento de treinos completados
4. **Gráficos**: Visualização de progresso
5. **Comunidade**: Feed social e desafios
6. **Vídeos**: Demonstrações de exercícios
7. **Mobile app**: React Native ou PWA

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT.

## 💪 Desenvolvido com

Feito com muito ❤️ e ☕ para ajudar iniciantes a começarem sua jornada fitness!

---

**TreinaÍ** - Seu treino. Sua inteligência. 🏋️‍♀️
