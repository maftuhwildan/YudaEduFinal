<p align="center">
  <img src="public/logo.png" alt="YudaEdu Logo" width="120" />
</p>

<h1 align="center">YudaEdu</h1>

<p align="center">
  <b>Your Ultimate Digital Assessment Platform</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript" />
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma" />
  <img src="https://img.shields.io/badge/TailwindCSS-3-06B6D4?logo=tailwindcss" />
  <img src="https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white" />
</p>

---

## 📖 Tentang Proyek

**YudaEdu** adalah platform ujian dan kuis digital berbasis web yang dirancang untuk memudahkan proses penilaian/asesmen di lingkungan pendidikan. Dibangun dengan **Next.js 15** dan **React 19**, YudaEdu menyediakan pengalaman ujian online yang modern, aman, dan efisien untuk guru (admin) maupun siswa.

---

## ✨ Fitur Utama

### 🎓 Untuk Admin / Guru

| Fitur | Deskripsi |
|---|---|
| **Dashboard Admin** | Panel kontrol lengkap untuk mengelola semua aspek platform |
| **Manajemen Kelas** | Buat dan kelola grup kelas siswa |
| **Manajemen Pengguna** | Tambah, edit, hapus siswa beserta nomor absen dan kelas |
| **Paket Ujian** | Buat paket ujian dengan batas waktu, token akses, dan jadwal |
| **Bank Soal** | Kelola soal dengan varian, stimulus, gambar, dan opsi jawaban |
| **Rich Text Editor** | Editor WYSIWYG untuk membuat soal dengan format HTML, tabel, dan gambar |
| **AI Question Generator** | Generate soal otomatis menggunakan **Google GenAI** atau **Groq AI** |
| **Import Excel** | Upload soal secara massal dari file Excel (.xlsx) |
| **Monitoring Ujian** | Pantau siswa yang sedang mengerjakan ujian secara real-time |
| **Siswa Belum Ujian** | Lihat daftar siswa yang belum mengerjakan ujian per kelas |
| **Hasil Ujian** | Lihat, analisis, dan export hasil ujian ke Excel |
| **Analisis Ujian** | Visualisasi statistik ujian dengan grafik (Recharts) |
| **Login Slides** | Kelola slide/carousel yang tampil di halaman login |
| **Profil Admin** | Ubah foto profil, nama lengkap, username, dan password |
| **Randomisasi** | Acak urutan soal dan opsi jawaban per siswa |
| **Token Ujian** | Kontrol akses ujian dengan token (case-sensitive) |
| **Auto-Rotate Token** | Token otomatis berubah secara berkala |
| **Penjadwalan Ujian** | Atur waktu mulai dan berakhirnya ujian |

### 📝 Untuk Siswa

| Fitur | Deskripsi |
|---|---|
| **Login Aman** | Autentikasi dengan username dan password |
| **Pilih Ujian** | Masukkan token untuk mengakses paket ujian yang tersedia |
| **Antarmuka Kuis** | UI modern dan responsif untuk mengerjakan soal |
| **Timer Ujian** | Hitung mundur waktu ujian yang tersisa |
| **Auto-Submit** | Ujian otomatis tersubmit saat waktu habis |
| **Progress Tracking** | Lacak progres soal yang telah dijawab |
| **Lihat Hasil** | Lihat skor dan detail jawaban setelah ujian selesai |

### 🔒 Keamanan

| Fitur | Deskripsi |
|---|---|
| **Anti-Cheat Detection** | Deteksi pergantian tab/window selama ujian |
| **Fullscreen Mode** | Mode layar penuh untuk meminimalisir kecurangan |
| **Session Management** | Satu sesi aktif per pengguna, login baru akan mengeluarkan sesi lama |
| **Session Kick Notification** | Notifikasi otomatis jika sesi diambil alih oleh perangkat lain |
| **Password Hashing** | Enkripsi password menggunakan bcrypt |
| **Token Re-auth** | Siswa harus memasukkan ulang token jika logout saat ujian berlangsung |

### 🎨 UI/UX

| Fitur | Deskripsi |
|---|---|
| **Responsive Design** | Tampilan optimal di desktop dan mobile |
| **Dark/Light Mode** | Tema gelap dan terang dengan toggle |
| **Animasi Halus** | Transisi dan animasi menggunakan Framer Motion |
| **Skeleton Loading** | Loading state elegan saat memuat data |
| **ShadcnUI Components** | Komponen UI modern dan konsisten |

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|---|---|
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router) |
| **Frontend** | [React 19](https://react.dev/) + [TypeScript 5.8](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS 3](https://tailwindcss.com/) + [ShadcnUI](https://ui.shadcn.com/) |
| **Animasi** | [Framer Motion](https://www.framer.com/motion/) |
| **Database** | [MySQL](https://www.mysql.com/) |
| **ORM** | [Prisma 6](https://www.prisma.io/) |
| **Authentication** | NextAuth.js v4 (Credentials Provider) |
| **AI** | [Google GenAI](https://ai.google.dev/) + [Groq SDK](https://groq.com/) |
| **Charts** | [Recharts](https://recharts.org/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Font** | [Inter](https://fonts.google.com/specimen/Inter) (Google Fonts) |
| **Excel** | [SheetJS (xlsx)](https://sheetjs.com/) |

---

## 📁 Struktur Proyek

```
YudaEduEx/
├── app/                          # Next.js App Router
│   ├── actions/                  # Server Actions
│   │   ├── admin.ts              # Aksi admin (CRUD users, classes, packs, questions)
│   │   ├── auth.ts               # Autentikasi (login, logout, session)
│   │   ├── exam.ts               # Logika ujian (start, submit, save progress)
│   │   └── monitoring.ts         # Monitoring & hasil ujian
│   ├── api/                      # API Routes
│   │   ├── slides/               # API untuk login slides
│   │   └── upload/               # API untuk upload gambar
│   ├── lib/
│   │   └── prisma.ts             # Prisma Client singleton
│   ├── login/                    # Halaman login
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Halaman utama (routing admin/siswa)
│
├── components/                   # React Components
│   ├── AdminDashboard.tsx        # Shell dashboard admin
│   ├── admin/                    # Komponen admin
│   │   ├── AdminProfile.tsx      # Manajemen profil admin
│   │   ├── ClassManagement.tsx   # Manajemen kelas
│   │   ├── UserManagement.tsx    # Manajemen pengguna
│   │   ├── ExamPacks.tsx         # Manajemen paket ujian
│   │   ├── QuestionBank.tsx      # Bank soal
│   │   ├── RichTextEditor.tsx    # Editor soal WYSIWYG
│   │   ├── ExamMonitoring.tsx    # Monitoring ujian real-time
│   │   ├── MissingStudents.tsx   # Siswa yang belum ujian
│   │   ├── ExamResults.tsx       # Hasil ujian
│   │   ├── ExamAnalysis.tsx      # Analisis & statistik ujian
│   │   ├── LoginSlidesManagement.tsx  # Manajemen slide login
│   │   └── TabSkeleton.tsx       # Skeleton loading
│   ├── auth/                     # Komponen autentikasi
│   │   ├── Login.tsx             # Komponen login
│   │   ├── LoginSlider.tsx       # Carousel slider di halaman login
│   │   └── login-form.tsx        # Form login
│   ├── quiz/                     # Komponen kuis/ujian
│   │   ├── Quiz.tsx              # Antarmuka ujian siswa
│   │   └── ResultView.tsx        # Tampilan hasil ujian
│   ├── layout/                   # Komponen tata letak
│   │   ├── theme-provider.tsx    # Provider tema dark/light
│   │   └── mode-toggle.tsx       # Toggle dark/light mode
│   └── ui/                       # ShadcnUI components
│
├── hooks/                        # Custom React Hooks
│   ├── useAdminHandlers.ts       # Handler aksi admin
│   ├── useAntiCheat.ts           # Deteksi kecurangan
│   ├── useFullscreen.ts          # Mode layar penuh
│   ├── useQuizSession.ts         # Manajemen sesi ujian
│   ├── useQuizTimer.ts           # Timer hitung mundur
│   └── useTableAutoScale.ts     # Auto-scale tabel di soal
│
├── lib/                          # Utilitas
│   ├── auth-guard.ts             # Guard autentikasi
│   ├── constants.ts              # Konstanta aplikasi
│   ├── formatQuizContent.ts      # Format konten soal HTML
│   ├── logger.ts                 # Logger
│   └── utils.ts                  # Utility functions (cn)
│
├── prisma/                       # Prisma ORM
│   ├── schema.prisma             # Skema database
│   └── seed.ts                   # Data seed awal
│
├── types/
│   └── index.ts                  # TypeScript type definitions
│
└── public/                       # Asset statis
    ├── logo.png                  # Logo YudaEdu
    ├── login-bg.png              # Background halaman login
    ├── login-illustration.jpg    # Ilustrasi login
    └── uploads/                  # Upload gambar (soal, profil)
```

---

## 📊 Database Schema

```mermaid
erDiagram
    User ||--o{ Result : has
    User ||--o{ ExamSession : has
    User }o--|| ClassGroup : belongs_to
    QuizPack ||--o{ Question : contains
    QuizPack ||--o{ ExamSession : has

    User {
        string id PK
        string username UK
        string fullName
        string absentNumber
        string passwordHash
        enum role
        string classId FK
        int maxAttempts
        int currentAttempts
        string sessionToken
        string profileImage
    }

    ClassGroup {
        string id PK
        string name
    }

    QuizPack {
        string id PK
        string name
        boolean isActive
        int timeLimit
        string token
        json allowedClassIds
        boolean randomizeQuestions
        boolean randomizeOptions
        datetime scheduleStart
        datetime scheduleEnd
        boolean autoRotateToken
    }

    Question {
        string id PK
        string packId FK
        string variant
        text text
        text stimulus
        string imageUrl
        json options
        text correctAnswer
    }

    ExamSession {
        string userId PK_FK
        string packId PK_FK
        string username
        string fullName
        string classId
        string packName
        string variant
        bigint startTime
        bigint lastUpdate
        int currentQuestionIndex
        int answeredCount
        json answers
        int totalQuestions
        int cheatCount
        string status
        float score
        datetime endTime
    }

    Result {
        string id PK
        string userId FK
        string username
        string classId
        float score
        int correctCount
        int totalQuestions
        string packName
        string variant
        datetime timestamp
        int cheatCount
        json answers
    }

    LoginSlide {
        string id PK
        string title
        text description
        string imageUrl
        int order
        boolean isActive
        datetime createdAt
    }
```

---

## 🚀 Cara Instalasi & Setup

### Prasyarat

Pastikan kamu sudah menginstall:

- **Node.js** v18+ ([Download](https://nodejs.org/))
- **MySQL** 8+ ([Download](https://dev.mysql.com/downloads/))
- **Git** ([Download](https://git-scm.com/))
- **npm** (sudah termasuk dalam Node.js)

### 1. Clone Repository

```bash
git clone https://github.com/username/YudaEduEx.git
cd YudaEduEx
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

Buat file `.env` di root proyek:

```env
# Database MySQL
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE_NAME"

# NextAuth (generate random string untuk secret)
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Google GenAI API Key (untuk AI question generation)
GOOGLE_GENAI_API_KEY="your-google-genai-api-key"

# Groq API Key (alternatif AI provider)
GROQ_API_KEY="your-groq-api-key"
```

> [!TIP]
> Untuk generate `NEXTAUTH_SECRET`, jalankan: `openssl rand -base64 32`

### 4. Setup Database

```bash
# Push schema ke database MySQL
npx prisma db push

# Generate Prisma Client
npx prisma generate

# (Opsional) Seed data awal (admin + contoh data)
npx tsx prisma/seed.ts
```

### 5. Jalankan Development Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

---

## 🔑 Login Default

Setelah menjalankan seed, gunakan kredensial berikut:

| Role | Username | Password |
|---|---|---|
| **Admin** | `admin` | `admin123` |

> [!CAUTION]
> Segera ubah password admin default setelah deploy ke production!

---

## 📋 Panduan Penggunaan

### 👨‍💼 Sebagai Admin

#### 1. Manajemen Kelas
- Buka tab **Kelas** di dashboard
- Klik **Tambah Kelas** untuk membuat grup kelas baru
- Contoh: `12 IPA 1`, `12 IPS 2`, dsb.

#### 2. Manajemen Pengguna (Siswa)
- Buka tab **Pengguna**
- Tambahkan siswa satu per satu atau import dari Excel
- Setiap siswa harus di-assign ke kelas
- Atur nomor absen dan batas percobaan ujian

#### 3. Membuat Paket Ujian
- Buka tab **Paket Ujian**
- Buat paket baru dengan pengaturan:
  - **Nama ujian** — Contoh: "UTS Matematika Kelas 12"
  - **Batas waktu** — Dalam menit (contoh: 60)
  - **Token akses** — Kode unik untuk siswa masuk ujian (case-sensitive)
  - **Kelas yang diizinkan** — Pilih kelas yang boleh mengakses
  - **Randomisasi** — Acak urutan soal dan/atau opsi jawaban
  - **Jadwal** — Atur waktu mulai dan berakhirnya ujian
  - **Auto-rotate token** — Token otomatis berubah secara berkala

#### 4. Menambah Soal
Ada 3 cara menambah soal:

**Manual:**
- Buka tab **Bank Soal**
- Klik **Tambah Soal**
- Gunakan Rich Text Editor untuk menulis soal dengan format, tabel, atau gambar
- Isi stimulus (opsional), pertanyaan, opsi jawaban, dan jawaban benar
- Pilih varian soal (A, B, C, dsb.)

**Import Excel:**
- Siapkan file .xlsx dengan format kolom yang sesuai
- Upload melalui fitur import di Bank Soal

**AI Generator:**
- Pilih provider AI (Google GenAI / Groq)
- Masukkan topik/materi yang diinginkan
- Pilih varian soal
- AI akan generate soal otomatis yang bisa diedit sebelum disimpan

#### 5. Monitoring Ujian
- Buka tab **Monitoring** saat ujian berlangsung
- Pantau progress siswa secara real-time:
  - Jumlah soal yang dijawab
  - Waktu tersisa
  - Jumlah pelanggaran (cheat count)
- Lihat siswa yang belum mengerjakan ujian

#### 6. Hasil & Analisis
- Tab **Hasil Ujian** — Lihat skor lengkap semua siswa, export ke Excel
- Tab **Analisis** — Visualisasi statistik dengan grafik

### 👨‍🎓 Sebagai Siswa

1. **Login** dengan username dan password yang diberikan guru
2. **Masukkan Token** ujian yang diberikan guru
3. **Kerjakan Ujian** — Jawab semua soal dalam batas waktu
4. **Submit** — Klik submit atau tunggu auto-submit saat waktu habis
5. **Lihat Hasil** — Skor dan detail jawaban akan ditampilkan

> [!WARNING]
> - Jangan pindah tab/window selama ujian, sistem akan mendeteksi dan mencatat sebagai pelanggaran
> - Ujian berjalan dalam mode fullscreen untuk keamanan
> - Login dari perangkat lain akan mengeluarkan sesi aktif

---

## ⚙️ Environment Variables

| Variable | Deskripsi | Wajib |
|---|---|---|
| `DATABASE_URL` | URL koneksi MySQL | ✅ |
| `NEXTAUTH_SECRET` | Secret key untuk NextAuth.js | ✅ |
| `NEXTAUTH_URL` | Base URL aplikasi | ✅ |
| `GOOGLE_GENAI_API_KEY` | API key Google GenAI | ❌ (untuk fitur AI) |
| `GROQ_API_KEY` | API key Groq | ❌ (untuk fitur AI) |

---

## 🧑‍💻 Scripts

```bash
# Development
npm run dev              # Jalankan dev server (port 3000)
npm run build            # Build untuk production
npm run start            # Jalankan production server
npm run lint             # Jalankan linter

# Database
npx prisma db push       # Push schema ke database
npx prisma generate      # Generate Prisma Client
npx prisma studio        # Buka GUI database
npx prisma migrate dev   # Buat migration file

# Seeding
npx tsx prisma/seed.ts   # Jalankan database seed
```

---

## 🚢 Deployment

### Deploy ke Production

1. **Build aplikasi:**
   ```bash
   npm run build
   ```

2. **Set environment variables** di server/hosting provider

3. **Push database schema:**
   ```bash
   npx prisma db push
   ```

4. **Seed data awal (jika pertama kali):**
   ```bash
   npx tsx prisma/seed.ts
   ```

5. **Jalankan server:**
   ```bash
   npm run start
   ```

### Platform yang Didukung

- **Vercel** — Recommended (native Next.js support)
- **Railway** — Database + hosting
- **PlanetScale** — MySQL serverless
- **VPS** — Menggunakan PM2 atau Docker

---

## 📸 Screenshots

> _Tambahkan screenshot aplikasi di sini_

<!-- 
![Login Page](screenshots/login.png)
![Admin Dashboard](screenshots/dashboard.png)
![Quiz Interface](screenshots/quiz.png)
![Exam Results](screenshots/results.png)
-->

---

## 🤝 Kontribusi

1. Fork repository ini
2. Buat branch fitur (`git checkout -b feature/fitur-baru`)
3. Commit perubahan (`git commit -m 'Tambah fitur baru'`)
4. Push ke branch (`git push origin feature/fitur-baru`)
5. Buat Pull Request

---

## 📝 Catatan Penting

- **Token ujian** bersifat case-sensitive
- **Soal mendukung konten HTML** (teks berformat, tabel, gambar)
- **Batas waktu** ujian dalam satuan menit
- **Deteksi kecurangan** melacak perpindahan tab/window
- **Sesi login** hanya boleh 1 per pengguna (login baru = logout sesi lama)
- **Data ujian** tersimpan otomatis selama proses pengerjaan

---

## 📜 Lisensi

Proyek ini dibuat untuk keperluan pendidikan.

---

<p align="center">
  Made with ❤️ by <b>YudaEdu Team</b>
</p>
