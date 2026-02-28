# YudaEdu — Portfolio Write-Up

---

## Tentang Proyek

**YudaEduEx** adalah aplikasi *Computer-Based Test (CBT)* berbasis web yang gue bangun untuk kebutuhan ujian digital di lingkungan sekolah nyata — dipakai guru dan siswa, bukan sekadar project latihan.

**Stack:** Next.js 14 (App Router) · TypeScript · Prisma ORM · PostgreSQL · ShadcnUI · Docker

---

## Cara Gue Ngerjainnya (Transparent)

Gue pakai **AI-assisted development workflow** dengan AI agent sebagai pair programmer.

| Gue yang kerjain | AI yang kerjain |
|---|---|
| Definisikan kebutuhan & alur dari pengalaman nyata | Implementasi kode dari spesifikasi gue |
| Keputusan arsitektur & kebijakan data | Analisis forensik code path saat gue beri skenario |
| Nemu bug dari penggunaan langsung (matiin WiFi, buka 2 tab, dll) | Eksekusi patch berdasarkan temuan |
| Validasi & uji setiap perubahan | Menjelaskan trade-off tiap pendekatan |

---

## Tantangan & Perjalanan Ngerjainnya

### 1. Membangun Core Exam Engine dari Nol
- Login dengan sesi cookie + rate limiting (max 5 attempts/60 detik)
- Token ujian milik QuizPack untuk kontrol akses — token hanya berlaku di awal, tidak re-validasi saat submit
- Sistem soal multi-variant (Variant A/B/C berbeda antarkelas dari soal yang sama)
- Timer ujian real-time menggunakan **server timestamp** — bukan `Date.now()` client lokal — untuk menghindari siswa nakal yang set jam maju/mundur
- Auto-submit otomatis terpicu begitu waktu di server habis

### 2. Refactor Arsitektur Kode (Sebelum Terlambat)
Waktu codebase makin besar, gue nyadar semua Server Actions numpuk jadi 1 file monolitik `app/actions.ts`. Ini jadi susah di-maintain. Gue refactor total jadi arsitektur domain-based:
- `auth.ts` — login, logout, session management
- `exam.ts` — ambil soal, submit, status siswa
- `admin.ts` — CRUD users, kelas, soal, analytics
- `monitoring.ts` — heartbeat, session expiry

### 3. Database Restore & Penanganan File Mentah (The Hard Way)
Gue pernah ngadepin momen di mana gue harus **restore database dari file dump mentah** (SQL/Prisma), dan ini lumayan *painful* karena muncul masalah _orphaned records_ dan _schema mismatch_.
- Dari situ gue bikin API khusus `/api/admin/fix-db` sebagai "Database Self-Healing Routine". Script ini secara otomatis mendeteksi _orphaned users_ atau hasil ujian nyasar dan memasukkannya ke "Kelas Pemulihan", alih-alih ngebiarin aplikasinya crash. 

### 4. Optimalisasi Upload Soal & Gambar
Sistem ujian CBT umumnya ngelibatin banyak aset gambar. Daripada gue simpan gambar langsung ke dalam text database (Base64) yang bikin DB bengkak super lambat, gue rombak sistemnya:
- **Disk-Storage Uploads:** Gambar di-upload dan diproses terpisah ke direktori `public/uploads` (`/api/upload`).
- **Path-only Database:** Database cuma baca string path URL-nya doang. Hasilnya? Query untuk nge-load soal berisi 50 gambar tetep secepat kilat.
- **Bulk Import Excel:** Admin bisa upload massal ribuan soal + opsi jawaban cuma pakai format Excel/CSV.

### 5. Performance Overhaul — Lazy Tab Loading
Dashboard admin awalnya fetch **semua data sekaligus** saat pertama buka. Pas data bertambah banyak, ini jadi berat dan lambat. Gue refactor ke sistem:
- **Lazy fetch per tab** — data hanya dimuat saat tab diklik pertama kali
- **Stale-while-revalidate 30 detik** — tab yang sudah dibuka tidak re-fetch kalau baru 30 detik
- **Smart refresh** — tombol refresh hanya me-refresh data tab yang sedang aktif, bukan semua tab
- Skeleton UI (ShadcnUI) ditambahkan di tiap tab saat loading berlangsung

### 6. Real-time Exam Monitoring & Sistem Anti-Cheat
- **Live Status:** Online / Offline / Selesai (dengan pengecekan nomor soal, jumlah terjawab, dan flag)
- **Safe Heartbeat:** Sinkronisasi tiap 3 detik dengan recursive `setTimeout` — bukan `setInterval` — buat cegah memori leak kalo koneksi lelet. Server otomatis nge-expire sesi siswa yang *overdue*.
- **Device & Tab-Switch Detection:** Keluar fullscreen atau pindah tab = nambah hitungan *cheat flag*. Flag tercatat di DB dan kelihatan real-time di admin.
- **Mobile Landscape Lock Audit:** Nyesuain _behavior_ mobile yang rese'. Android pakai `screen.orientation.unlock()` biar optimal, sementara fitur Fullscreen API di iOS di-bypass karena nggak di-_support_ dari sononya biar nggak munculin error fiktif.

### 7. UX, Layouting & Docker Ops
- **Login Slider:** Halaman login dibikin _Carousel_ dinamis via CMS Admin dashboard (upload gambar, teks, urutan, toggle aktif).
- **Mobile-Responsive Admin Panel:** Admin dashboard yang padat direkayasa jadi Drawer/Overlay Sidebar buat admin yang mantau ujian dari layar HP.
- **ShadcnUI Dialog Guard:** Ngeganti `window.confirm` _native Javascript_ jadul pakai komponen `Dialog` dari ShadcnUI buat tombol krusial seperti _Delete User_, _Re-quiz_, dan hapus hasil ujian. UX-nya kerasa lebih premium.
- **Inline Edit & Production Logs:** Bikin fitur Edit Kelas _inline_, dan mindahin `console.log()` ke sistem Logging terstruktur pakai Docker Logs, biar gampang dilacak waktu ujian skala besar jalan.

### 8. Data Integrity — Historical Results
- Hasil ujian **tidak dihapus** saat siswa remedial — disimpan permanen sebagai historis.
- Kebijakan **Highest Score**: data analitik kelas dikalkulasi otomatis cuma ambil nilai _attempt_ terbaik per siswa.
- **Proteksi Double-Submit:** Prisma transaction lock. Hanya 1 _submission_ yang masuk meski tombol *Submit* ditekan siswa 100 kali berturut-turut karena nge-lag.

---

## Resilience Audit — Edge Case Forensics
Setelah sistem selesai, gue lakuin sesi **Threat Modeling** — aktif nge-test skenario ekstrem di lapangan langsung nangkep code path-nya:

| Skenario yang Gue Test | Temuan | Fix |
|---|---|---|
| Buka ujian di 2 tab berbarengan | Tab background *overwrite* data via heartbeat | Cross-tab sync lewat `storage` API event |
| Tab ujian di-minimize 5+ menit | Chrome auto-*throttle* `setTimeout`, siswa seolah Offline | `visibilitychange` buat "adrenaline shot" |
| Internet putus-nyambung bebas | API `fetch` _hanging_, heartbeat loop modar | `Promise.race` 10s timeout _interceptor_ |
| Klik submit saat internet mati | Error DB *swallow* jadi "Akun di alat lain" | Pisahin `catch` Prisma DB vs JSON Error |
| Pencet F5 pas *loading upload* | ✅ Aman! | LocalStorage state backup dijahit lagi pas _reload_ |

---

## Refleksi
Bagian paling *challenging* buat gue sebenernya **bukan nulis kodenya** — karena AI *co-pilot* ngebantu ngebutin sintaksnya. Tapi **punya insting buat tau apa yang harus dicurigai**.

Contohnya waktu tab double tiba-tiba eror. Gue waktu itu belum tau istilah *"localStorage storage event"*. Waktu siswa tiba-tiba keliatan offline tanpa sebab, gue nggak tau menau soal *"browser tab throttling"*. Tapi modal gue adalah gue bisa **ngartikulasikan simtom-nya** dan ngasih tahu _skenario yang bener_ ke AI buat ngegali _root cause_-nya.

Nalar buat nge-debug _business logic_ di skala yang _messy_ kaya lapangan sekolah, lalu mengeksekusinya jadi arsitektur *codebase* — **itu yang gue anggap sebagai _skill_ paling bernilai yang gue bangun dari proyek ini.**

---
*Proyek ini diluncurkan & aktif digunakan di sekolah nyata. Source code tersedia atas permintaan.*
