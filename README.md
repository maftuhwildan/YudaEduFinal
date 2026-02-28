# YudaEdu — Computer-Based Test (CBT) Engine
> *A production-ready Web App for real-world academic testing. Built with focus on resilience, anti-cheat mechanisms, and zero-downtime database recovery.*

---

## 🚀 The Project at a Glance

**YudaEduEx** adalah sistem *Computer-Based Test (CBT)* berbasis web yang saya rancang dan kembangkan untuk menangani ujian berskala sekolah. Bukan sekadar proyek latihan—ini adalah produk yang benar-benar digunakan di lapangan oleh ratusan siswa dan puluhan guru secara *real-time*.

**Tech Stack:** Next.js 14 (App Router) · TypeScript · Prisma ORM · MySQL · ShadcnUI · Docker

---

## 🛠️ The Architecture & Challenges Solved

### 1. Custom Core Exam Engine
Alih-alih memakai solusi *off-the-shelf*, saya membangun *core exam engine* ini dari nol untuk memastikan kontrol penuh terhadap *edge cases* di lapangan:
- **Resilient Timer:** Timer ujian divalidasi dengan **server timestamp** saat *handshake* dan submit, mencegah eksploitasi di mana siswa memanipulasi jam lokal di *device* mereka.
- **Fair Multi-variant System:** Sistem secara matematis mendistribusikan soal *Variant A/B/C* secara acak namun merata antar siswa dalam satu kelas untuk mencegah contek massal.
- **Auto-Submit Protocol:** Begitu waktu ujian di server habis, ujian akan di-submit secara paksa tanpa campur tangan *client-side*.

### 2. Domain-Driven Refactoring
Seiring dengan bertambah kompleksnya sistem, *Server Actions* Next.js yang tadinya berbentuk satu *monolithic file* saya refactor ke dalam arsitektur berbasis domain:
- `auth.ts` — Menangani *Cookie Session*, *Rate Limiting* (max 5 attempt/menit), dan otorisasi.
- `exam.ts` — Bertanggung jawab atas distribusi *QuizPack*, verifikasi token, dan logic ujian.
- `monitoring.ts` — Mengelola sinkronisasi *heartbeat* dan *session expiry*.

### 3. Database Self-Healing Routine
Saat berhadapan dengan data mentah (SQL/Prisma *raw dump restore*) di skala produksi, *orphaned records* adalah mimpi buruk operasional. 
- Saya membangun *automated* API `/api/admin/fix-db` yang berfungsi layaknya petugas medis database. Script ini berjalan menyisir database, mencari relasi User dan Result yang putus (nyasar), dan secara diam-diam memindahkannya ke "Kelas Pemulihan" sehingga aplikasi tetap berjalan *crash-free* 100%.

### 4. Disk-to-Database Image Optimization
Menyimpan *base64* image ke dalam database teks relasional sangat membunuh performa *load time*. 
- **Disk-Storage Uploads:** Gambar di-upload dan diproses terpisah ke direktori fisik di VPS.
- **Path-only Database:** Database MySQL kini bertindak hanya sebagai *pointer* (menyimpan URL path) yang mengarah ke *folder directory* di dalam VPS. Hasilnya? *Query load time* untuk soal 50 nomor *full-image* menjadi secepat kilat.
- Terdapat fungsi *Bulk Import* via Excel/CSV untuk guru yang butuh mengunggah ratusan soal dalam satu klik.

### 5. Frontend Performance: Lazy Tab Loading
Dashboard admin YudaEduEx memuat ribuan baris data analitik kelas, *users*, dan hasil ujian. Untuk mencegah *bottleneck* saat login pertama kali:
- **Lazy Data Fetching:** Data di dalam *tab* tidak akan di-*fetch* sampai *tab* tersebut benar-benar di-klik.
- **Stale-while-revalidate:** *Caching response* selama 30 detik untuk *tab switching* yang responsif.
- **Smart Skeleton UI (Shadcn):** Memberi kesan *snappy* saat transmisi data.

### 6. Real-time Monitoring & Anti-Cheat Engine
- **Safe Heartbeat System:** Menggunakan skema rekursif `setTimeout` (menghindari kelemahan *memory-leak* pada `setInterval`) yang sinkron ke server setiap 3 detik. Otomatis nge-_kick_ sesi siswa yang terdeteksi *overdue*.
- **Device & Tab-Switch Detection:** *Fullscreen enforcement*. Pindah tab atau keluar layar penuh = peringatan *pop-up* agresif dan iterasi angka kecurangan bertambah *real-time* di panel Admin.
- **Mobile Landscape Audit:** Integrasi *cross-platform* dengan `screen.orientation.unlock()` pada Android, sembari menangani isolasi API di ekosistem iOS tanpa *error throwing*.

---

## 🔎 Threat Modeling & Resilience Forensics

Aplikasi lapangan tidak pernah berdampingan ramah dengan koneksi internet yang putus-nyambung atau *hardware* spesifikasi rendah. Di sinilah saya melakukan siklus *Threat Modeling* skenario lapangan yang sesungguhnya:

| Root Cause / Skenario Ekstrem | Dampak Awal Sebelum Disolve | Solusi Engineering (Fixed) |
|---|---|---|
| Siswa nakal login di 2 perangkat/tab | Tab yg tertinggal secara diam-diam menumpuk (overwrite) data baru via heartbeat delay | *Cross-tab sync enforcement* melalui `storage` *API event listener* |
| Browser me-*minimize* tab (Hemat Baterai) | Chrome melakukan *auto-throttle setTimeout*, server menganggap siswa Offline | Injeksi sintesis *visibilitychange listener* sbg penarik "*Adrenaline Shot*" paksa |
| Koneksi sekolah RTO (Request Time Out) | API nge-gantung permanen (*Hanging Promise*), *heartbeat loop* mati tanpa peringatan | `Promise.race` *interceptor* timeout 10 detik dan memicu *fallback retry* |
| Submit dengan WiFi mati lalu hidup kembali | Prisma DB *throw error*, JSON catch error ter-swallow jd error fiktif "Akun nyangkut" | Isolasi pemisahan alur `catch` Prisma DB vs JSON Error Payload |

---

## 💡 Developer’s Note: The Real Value

Bagi saya, tantangan sesungguhnya dalam rekayasa perangkat lunak bukanlah menghafal algoritma kompleks—tapi membangun insting investigasi saat sistem kolaps di bawah tekanan dunia nyata. 

Ketika sistem pelaporan mencatat "Siswa A ujiannya *blank* offline tanpa sebab", pengalaman ini mengajarkan saya untuk tidak menyalahkan siswa terlebih dahulu, melainkan mulai memburu anomali di level protokol. Menemukan fakta bahwa akar masalahnya adalah fitur **Browser Tab Throttling** yang men-*suspend* *javascript thread*—lalu berhasil mengeksekusi arsitektur mitigasinya menggunakan API *visibility change*—adalah jenis ilmu lapangan dan validasi arsitektural yang tidak bisa dipelajari tanpa pengalaman langsung.

**Ini bukan sekadar kode yang bisa berjalan; ini adalah produk yang bisa diajak perang.**

---
*Proyek ini berjalan aktif melayani kebutuhan asessment berskala nyata. Source code lengkap tersedia atas permintaan langsung.*
