# YudaEdu (EduExam)

> Your Ultimate Digital Assessment Platform

## About This Project

Next.js 15 web application for online exams/quizzes. Features include:
- Admin dashboard for managing questions, quiz packs, users, and classes
- Student quiz interface with timer, anti-cheat detection, and progress tracking  
- AI-powered question generation (Google GenAI / Groq)
- Rich text editor for question content with image/table support
- Excel import for bulk question upload
- Real-time exam session management

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js v4
- **UI**: ShadcnUI + Tailwind CSS + Framer Motion
- **AI**: Google GenAI, Groq SDK

## Key Directories

```
├── app/                    # Next.js app router
│   ├── actions.ts          # Server actions (all backend logic)
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main page (dashboard routing)
│   ├── login/              # Login page
│   └── lib/prisma.ts       # Prisma client singleton
├── components/             # React components
│   ├── AdminDashboard.tsx  # Admin interface (users, questions, packs)
│   ├── Quiz.tsx            # Student quiz interface
│   ├── RichTextEditor.tsx  # WYSIWYG editor for questions
│   ├── Login.tsx           # Login component
│   └── ui/                 # ShadcnUI components
├── prisma/
│   └── schema.prisma       # Database schema
├── lib/                    # Utilities
└── types.ts                # TypeScript type definitions
```

## Database Models

- `User` - Students and admins with class assignment
- `ClassGroup` - Class/group organization
- `QuizPack` - Exam configurations (time limit, token, schedule)
- `Question` - Questions with variants, options, stimulus
- `ExamSession` - Active/completed exam attempts
- `Result` - Exam results and scores

## Common Commands

```bash
# Development
npm run dev              # Start dev server (port 3000)
npm run build            # Production build
npm run start            # Start production server

# Database
npx prisma db push       # Push schema changes to database
npx prisma generate      # Generate Prisma client
npx prisma studio        # Open database GUI
npx prisma migrate dev   # Create migration

# Seeding
npx tsx prisma/seed.ts   # Run database seed
```

## Coding Standards

- TypeScript with strict typing
- Use ShadcnUI components from `@/components/ui`
- Server actions in `app/actions.ts` (no separate API routes)
- Use `cn()` from `lib/utils` for className merging
- Tailwind CSS for styling
- Framer Motion for animations

## Key Patterns

### Server Actions
All backend logic is in `app/actions.ts` using Next.js server actions with `"use server"` directive.

### Authentication
NextAuth with credentials provider. Check session on page load to route admin vs student.

### Quiz Flow
1. Student enters token → validates against QuizPack
2. ExamSession created with IN_PROGRESS status
3. On submit → update ExamSession to COMPLETED with score

## Environment Variables

```
DATABASE_URL=           # PostgreSQL connection (pooled)
DIRECT_URL=             # PostgreSQL direct connection
NEXTAUTH_SECRET=        # NextAuth secret key
GOOGLE_GENAI_API_KEY=   # Google AI API key
GROQ_API_KEY=           # Groq API key
```

## Notes

- Admin username: `admin` (default)
- Quiz token is case-sensitive
- Questions support HTML content (stimulus, text, options)
- Time limit is in minutes
- Cheat detection tracks tab switches
