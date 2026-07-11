# Caption Lab 🏷️

Generator caption produk berbasis AI (Claude) — upload foto produk, pilih gaya, dapatkan 3 variasi caption yang bikin orang penasaran & klik.

## Struktur Project

```
caption-lab/
├── index.html          ← Tampilan aplikasi (frontend)
├── api/
│   └── generate.js     ← Serverless function, panggil Claude API dengan aman
├── package.json
├── vercel.json
├── .env.example         ← Contoh environment variable
└── .gitignore
```

API key **tidak pernah** ada di frontend. Semua panggilan ke Anthropic API terjadi di `api/generate.js`, yang jalan di server Vercel — browser cuma bicara ke `/api/generate`.

---

## Langkah 1 — Siapkan API Key

Aplikasi ini mendukung 3 provider AI, kamu bisa pilih langsung di aplikasi (dropdown "AI Provider"). **Kamu tidak wajib punya ketiganya** — cukup siapkan API key untuk provider yang mau kamu pakai duluan, yang lain bisa nyusul kapan saja.

**Claude (Anthropic)**
1. Buka [console.anthropic.com](https://console.anthropic.com)
2. Login / daftar (akun ini beda dari akun claude.ai biasa)
3. Isi billing → menu **API Keys** → **Create Key** → copy (format `sk-ant-...`)

**GPT (OpenAI)**
1. Buka [platform.openai.com](https://platform.openai.com)
2. Login / daftar, isi billing
3. Menu **API Keys** → **Create new secret key** → copy (format `sk-proj-...` atau `sk-...`)

**Gemini (Google)**
1. Buka [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Login pakai akun Google
3. Klik **Create API Key** → copy (format `AIzaSy...`)

Simpan semua key ini baik-baik, jangan share ke siapapun.

## Langkah 2 — Siapkan akun GitHub & Vercel

1. Buat akun di [github.com](https://github.com) kalau belum punya
2. Buat akun di [vercel.com](https://vercel.com) — bisa langsung **Sign up with GitHub** biar terhubung otomatis

## Langkah 3 — Upload project ke GitHub

**Opsi A — Pakai GitHub Desktop (paling mudah untuk pemula):**
1. Download & install [GitHub Desktop](https://desktop.github.com)
2. Buat repository baru, arahkan ke folder `caption-lab` ini
3. Klik "Publish repository"

**Opsi B — Pakai terminal/command line:**
```bash
cd caption-lab
git init
git add .
git commit -m "Initial commit - Caption Lab"
git branch -M main
git remote add origin https://github.com/USERNAME_KAMU/caption-lab.git
git push -u origin main
```
(Ganti `USERNAME_KAMU` dan buat dulu repo kosong bernama `caption-lab` di github.com sebelum push)

## Langkah 4 — Deploy ke Vercel

1. Login ke [vercel.com](https://vercel.com)
2. Klik **Add New → Project**
3. Pilih repository `caption-lab` yang baru di-upload dari GitHub
4. Di halaman konfigurasi:
   - **Framework Preset:** biarkan "Other" (Vercel akan otomatis mendeteksi `index.html` sebagai static dan `api/generate.js` sebagai function)
   - Jangan ubah Build Command / Output Directory, biarkan default
5. **PENTING** — sebelum klik Deploy, buka bagian **Environment Variables**, tambahkan API key untuk provider yang mau kamu pakai (boleh isi satu, boleh isi semua):
   - **Name:** `ANTHROPIC_API_KEY` → **Value:** key Claude kamu (`sk-ant-...`)
   - **Name:** `OPENAI_API_KEY` → **Value:** key GPT kamu (`sk-proj-...`)
   - **Name:** `GEMINI_API_KEY` → **Value:** key Gemini kamu (`AIzaSy...`)
   - Klik **Add** untuk masing-masing
6. Klik **Deploy**
7. Tunggu 30-60 detik, Vercel akan kasih link seperti `https://caption-lab-xxxx.vercel.app`

## Langkah 5 — Testing

1. Buka link yang diberikan Vercel
2. Upload foto produk
3. Pilih gaya caption
4. Klik **Generate 3 Caption**
5. Kalau muncul error terkait API key, cek lagi Langkah 4 poin 5 — pastikan `ANTHROPIC_API_KEY` sudah benar-benar tersimpan di Environment Variables project (Settings → Environment Variables), lalu **redeploy** (Deployments → titik tiga → Redeploy)

---

## Update aplikasi di masa depan

Setiap kali kamu push perubahan baru ke branch `main` di GitHub, Vercel akan **otomatis redeploy** — nggak perlu setting ulang apapun.

## Testing lokal (opsional, untuk yang familiar dengan command line)

```bash
npm install -g vercel
vercel dev
```
Buat file `.env` (copy dari `.env.example`) dan isi API key asli kamu di situ sebelum menjalankan `vercel dev`.

## Estimasi Biaya

- **Hosting di Vercel:** gratis untuk pemakaian personal/kecil (Hobby plan)
- **API AI:** berbayar per pemakaian (bukan langganan bulanan) di masing-masing provider — cek harga terbaru sebelum mulai:
  - Claude: [console.anthropic.com](https://console.anthropic.com)
  - GPT: [platform.openai.com](https://platform.openai.com)
  - Gemini: [ai.google.dev/pricing](https://ai.google.dev/pricing) (Gemini punya tier gratis dengan limit tertentu)

## Troubleshooting

| Masalah | Penyebab kemungkinan |
|---|---|
| "ANTHROPIC_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY belum di-set" | Environment Variable untuk provider yang dipilih belum ditambahkan di Vercel |
| Error 401 / "invalid api key" | API key salah/tidak valid, cek lagi di dashboard provider terkait |
| Error terkait billing/quota/credit | Saldo billing provider terkait belum di-top up, atau limit gratis habis |
| Gambar gagal terkirim | Foto terlalu besar — coba foto lain, frontend sudah otomatis resize ke maks 1024px |
| Nama model tidak dikenali provider | Provider mungkin sudah ganti nama model — override lewat env var `ANTHROPIC_MODEL` / `OPENAI_MODEL` / `GEMINI_MODEL` sesuai model terbaru dari dokumentasi resmi masing-masing |
