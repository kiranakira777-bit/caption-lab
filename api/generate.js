// api/generate.js
// Serverless function di Vercel — jalan di server, bukan di browser.
// API key disimpan aman lewat Environment Variable (GEMINI_API_KEY), TIDAK pernah dikirim ke client.

const STYLE_GUIDE = {
  heboh: 'Gaya HEBOH: penuh energi, banyak seruan, cocok untuk TikTok/Instagram Reels. Maksimal 3 baris pendek.',
  tiktok: 'Gaya TIKTOK: bahasa gen-z kekinian, mulai dengan hook viral ala "POV:", "ga nyangka...", "PSA buat yang...", atau storytelling super singkat 1 kalimat. Nada ngobrol santai tapi tetap punya twist yang bikin orang berhenti scroll. Maksimal 3 baris pendek.',
  formal: 'Gaya FORMAL: lebih rapi dan profesional, cocok untuk marketplace seperti Shopee/Tokopedia, tapi tetap punya hook dan urgency, bukan cuma deskripsi produk datar. Maksimal 3 baris pendek.',
  simple: 'Gaya SIMPLE: sangat ringkas dan to the point, tanpa basa-basi panjang. HANYA 1-2 kalimat pendek total, tapi tetap wajib ada hook singkat + CTA tegas di dalamnya.',
  ads: 'Gaya ADS: seperti copy iklan berbayar (Facebook/Instagram Ads), fokus ke satu benefit utama + satu urgency + CTA tegas. Maksimal 2-3 baris pendek, tiap baris singkat seperti copy iklan, bukan paragraf panjang.'
};

function buildSystemPrompt(style) {
  const chosenStyle = STYLE_GUIDE[style] || STYLE_GUIDE.heboh;
  return `Kamu adalah copywriter media sosial dan e-commerce Indonesia yang SPESIALIS membuat caption dengan CTR (click-through rate) setinggi mungkin.

Tugas: lihat gambar produk yang diberikan, lalu buat 3 VARIASI caption berbeda dengan gaya berikut:
${chosenStyle}

SETIAP caption, TANPA TERKECUALI dan TANPA PEDULI gaya/panjangnya, WAJIB mengandung ke-5 elemen pemicu CTR tinggi ini (boleh dipadatkan jadi sesingkat mungkin, tapi tidak boleh dihilangkan):
1. HOOK / curiosity gap — kalimat pembuka yang bikin orang penasaran, jangan langsung sebut nama produk di kata pertama
2. Value/benefit singkat — apa yang bikin produk ini spesial berdasarkan gambar (warna/motif/bahan/kesan gaya), dalam 1 frasa saja
3. Urgency atau social proof — kesan bahwa produk ini laris/terbatas/banyak diminati, dalam beberapa kata saja
4. Call-to-action yang tegas dan jelas — perintah aksi konkret (klik, checkout, DM, dll), bukan sekadar ajakan pasif
5. Emoji yang relevan dan natural, secukupnya, ditempatkan untuk menegaskan poin (bukan dekorasi kosong, jangan spam)

Aturan ketat:
- Tulis dalam Bahasa Indonesia gaul yang natural
- Setiap dari 3 caption harus terasa BEDA sudut pandang/hook-nya, bukan cuma ganti kata
- UTAMAKAN KERINGKASAN sesuai batas panjang gaya di atas — padat tapi tetap mengandung ke-5 elemen CTR
- JANGAN gunakan tanda kutip di dalam teks caption
- Balas HANYA dalam format JSON valid, tanpa teks lain, tanpa markdown, dengan struktur persis seperti ini:
{"captions":[{"label":"nama pendek sudut pandang caption 1","text":"isi caption 1"},{"label":"nama pendek sudut pandang caption 2","text":"isi caption 2"},{"label":"nama pendek sudut pandang caption 3","text":"isi caption 3"}]}`;
}

function extractJson(rawText) {
  const cleaned = rawText.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('AI tidak mengembalikan format JSON yang valid.');
  }
}

async function callGemini({ imageBase64, mediaType, systemPrompt }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY belum di-set di Environment Variables.');
  const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash';

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{
          parts: [
            { inline_data: { mime_type: mediaType, data: imageBase64 } },
            { text: 'Buatkan 3 caption sesuai instruksi di atas untuk produk di gambar ini.' }
          ]
        }],
        generationConfig: { response_mime_type: 'application/json', temperature: 0.9 }
      })
    }
  );
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error?.message || `Gemini HTTP ${resp.status}`);
  const rawText = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('\n') || '';
  return extractJson(rawText);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method tidak diizinkan. Gunakan POST.' });
  }

  try {
    const { imageBase64, mediaType, style } = req.body || {};

    if (!imageBase64 || !mediaType) {
      return res.status(400).json({ error: 'Gambar tidak ditemukan pada request.' });
    }

    const systemPrompt = buildSystemPrompt(style);
    const parsed = await callGemini({ imageBase64, mediaType, systemPrompt });

    if (!parsed?.captions?.length) {
      return res.status(502).json({ error: 'AI tidak mengembalikan caption yang valid.' });
    }

    return res.status(200).json({ captions: parsed.captions });

  } catch (err) {
    console.error('Error di /api/generate:', err);
    return res.status(500).json({ error: err.message || 'Terjadi kesalahan di server.' });
  }
}


