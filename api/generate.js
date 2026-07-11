// api/generate.js
// Serverless function di Vercel — jalan di server, bukan di browser.
// API key disimpan aman lewat Environment Variable, TIDAK pernah dikirim ke client.
// Mendukung 3 provider AI: Anthropic (Claude), OpenAI (GPT), Google (Gemini)

const STYLE_GUIDE = {
  heboh: 'gaya heboh, penuh energi, banyak seruan, cocok untuk TikTok/Instagram Reels. Maksimal 3 baris pendek.',
  santai: 'gaya santai, ngobrol seperti teman, tidak berlebihan. Maksimal 3 baris pendek.',
  formal: 'gaya lebih rapi dan profesional, cocok untuk marketplace seperti Shopee/Tokopedia. Maksimal 3 baris pendek.',
  simple: 'gaya SANGAT ringkas dan to the point, tanpa basa-basi panjang. HANYA 1-2 kalimat pendek total, langsung ke inti + CTA singkat.',
  ads: 'gaya iklan berbayar (seperti Facebook/Instagram Ads), fokus ke satu benefit utama + satu urgency + CTA tegas. Maksimal 2-3 baris pendek, tiap baris singkat seperti copy iklan, bukan paragraf panjang.'
};

function buildSystemPrompt(style) {
  const chosenStyle = STYLE_GUIDE[style] || STYLE_GUIDE.heboh;
  return `Kamu adalah copywriter media sosial dan e-commerce Indonesia yang ahli membuat caption dengan CTR tinggi.

Tugas: lihat gambar produk yang diberikan, lalu buat 3 VARIASI caption berbeda dengan gaya: ${chosenStyle}.

Setiap caption WAJIB mengikuti formula ini (tetap ringkas, jangan bertele-tele):
1. HOOK pembuka singkat yang bikin penasaran (jangan langsung sebut nama produk di kalimat pertama)
2. Deskripsi SANGAT singkat produk berdasarkan apa yang terlihat di gambar (cukup 1 frasa: warna/motif/bahan/kesan gaya, bukan kalimat panjang)
3. Urgency/social proof dalam beberapa kata saja, bukan kalimat penuh
4. Call-to-action singkat dan jelas
5. Emoji dipakai secukupnya dan relevan (jangan spam emoji, taruh natural di akhir kalimat)

Aturan ketat:
- Tulis dalam Bahasa Indonesia gaul yang natural
- Setiap caption harus terasa BEDA sudut pandangnya, bukan cuma ganti kata
- UTAMAKAN KERINGKASAN: ikuti batas panjang sesuai gaya yang diminta di atas, JANGAN membuat paragraf panjang
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

// ---- ANTHROPIC (Claude) ----
async function callAnthropic({ imageBase64, mediaType, systemPrompt }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY belum di-set di Environment Variables.');
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
          { type: 'text', text: 'Buatkan 3 caption sesuai instruksi di atas untuk produk di gambar ini.' }
        ]
      }]
    })
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error?.message || `Anthropic HTTP ${resp.status}`);
  const rawText = (data.content || []).map(b => b.text || '').join('\n').trim();
  return extractJson(rawText);
}

// ---- OPENAI (GPT) ----
async function callOpenAI({ imageBase64, mediaType, systemPrompt }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY belum di-set di Environment Variables.');
  const model = process.env.OPENAI_MODEL || 'gpt-4o';

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Buatkan 3 caption sesuai instruksi di atas untuk produk di gambar ini.' },
            { type: 'image_url', image_url: { url: `data:${mediaType};base64,${imageBase64}` } }
          ]
        }
      ]
    })
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error?.message || `OpenAI HTTP ${resp.status}`);
  const rawText = data.choices?.[0]?.message?.content || '';
  return extractJson(rawText);
}

// ---- GOOGLE GEMINI ----
async function callGemini({ imageBase64, mediaType, systemPrompt }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY belum di-set di Environment Variables.');
 const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

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
        generationConfig: { response_mime_type: 'application/json' }
      })
    }
  );
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error?.message || `Gemini HTTP ${resp.status}`);
  const rawText = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('\n') || '';
  return extractJson(rawText);
}

const PROVIDERS = {
  anthropic: callAnthropic,
  openai: callOpenAI,
  gemini: callGemini
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method tidak diizinkan. Gunakan POST.' });
  }

  try {
    const { imageBase64, mediaType, style, provider } = req.body || {};

    if (!imageBase64 || !mediaType) {
      return res.status(400).json({ error: 'Gambar tidak ditemukan pada request.' });
    }

    const chosenProvider = provider && PROVIDERS[provider] ? provider : 'anthropic';
    const systemPrompt = buildSystemPrompt(style);

    const parsed = await PROVIDERS[chosenProvider]({ imageBase64, mediaType, systemPrompt });

    if (!parsed?.captions?.length) {
      return res.status(502).json({ error: 'AI tidak mengembalikan caption yang valid.' });
    }

    return res.status(200).json({ captions: parsed.captions, provider: chosenProvider });

  } catch (err) {
    console.error('Error di /api/generate:', err);
    return res.status(500).json({ error: err.message || 'Terjadi kesalahan di server.' });
  }
}

