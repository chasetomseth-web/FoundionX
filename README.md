# wiastro

An all-in-one e-commerce operating system built with Next.js 15, TypeScript, and Tailwind CSS.

## 🚀 Features

- **Next.js 15** — App Router, server components, optimized performance
- **React 19** — Latest React with enhanced capabilities
- **Tailwind CSS** — Utility-first styling
- **Prisma + PostgreSQL** — Type-safe database ORM
- **Supabase** — Auth and realtime
- **Stripe** — Payments and webhooks
- **Brevo** — Transactional email
- **GoAffPro** — Affiliate tracking

## 🛠️ Installation

1. Install dependencies:
```bash
   npm install
```

2. Set up your environment variables:
```bash
   cp .env.example .env
```

3. Run database migrations:
```bash
   npx prisma migrate dev
```

4. Start the development server:
```bash
   npm run dev
```

5. Open [http://localhost:4028](http://localhost:4028)

## 📁 Project Structure
src/
├── app/              # Next.js App Router pages and API routes
├── components/       # Reusable UI components
├── contexts/         # React context providers
├── lib/              # Utilities, DB client, helpers
├── providers/        # Query and auth providers
├── styles/           # Global styles
prisma/
├── schema.prisma     # Database schema
├── migrations/       # Migration history

## 📦 Available Scripts

- `npm run dev` — Start development server on port 4028
- `npm run build` — Build for production
- `npm run serve` — Start production server
- `npm run lint` — Run ESLint
- `npm run lint:fix` — Auto-fix ESLint issues
- `npm run format` — Format with Prettier
- `npm run type-check` — TypeScript check

