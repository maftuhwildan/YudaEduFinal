---
description: Deploy the application to production
---

# Deployment

## Prerequisites

- PostgreSQL database (e.g., Supabase, Neon, Railway)
- Hosting platform (e.g., Vercel, Railway)

## Environment Variables

Set these in your hosting platform:
```
DATABASE_URL=postgresql://...?pgbouncer=true
DIRECT_URL=postgresql://...
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com
GOOGLE_GENAI_API_KEY=your-api-key
GROQ_API_KEY=your-groq-key
```

## Vercel Deployment

1. Connect repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy:
```bash
vercel --prod
```

## Manual Build

// turbo
1. Build the application:
```bash
npm run build
```

2. Start production server:
```bash
npm run start
```

## Post-Deployment

1. Run database migrations:
```bash
npx prisma db push
```

2. Seed admin user if needed:
```bash
npx tsx prisma/seed.ts
```
