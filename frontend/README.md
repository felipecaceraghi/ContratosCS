# ContratosCS Frontend

Frontend em Next.js para o sistema de emissão automatizada de contratos integrado ao SharePoint.

## 🚀 Funcionalidades

- **Autenticação JWT**: Login seguro com tokens
- **Dashboard**: Visualização do status do sistema e sincronização
- **Administração**: Criação de usuários (apenas para admins)
- **Design Responsivo**: Interface profissional com Tailwind CSS
- **Integração com Backend**: Comunicação via API REST

## 🛠️ Tecnologias

- **Next.js 15**: Framework React
- **TypeScript**: Tipagem estática
- **Tailwind CSS**: Estilização
- **Axios**: Requisições HTTP
- **Context API**: Gerenciamento de estado

## 📁 Estrutura do Projeto

```
src/
├── app/                    # App Router (Next.js 13+)
│   ├── login/             # Página de login
│   ├── dashboard/         # Dashboard principal
│   └── admin/
│       └── users/         # Administração de usuários
├── components/            # Componentes reutilizáveis
│   ├── LoadingSpinner.tsx
│   ├── AdminLayout.tsx
│   └── Navigation.tsx
├── lib/                   # Utilitários e configurações
│   ├── api.ts            # Cliente HTTP
│   └── auth.tsx          # Context de autenticação
└── types/                 # Definições TypeScript
    └── index.ts
```

## 🔧 Configuração

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente
Crie o arquivo `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5004
PORT=3000
```

### 3. Executar desenvolvimento

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
