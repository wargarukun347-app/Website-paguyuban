import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import express from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // AI News Writer
  // GEMINI_API_KEY hanya digunakan di server dan tidak pernah dikirim ke browser.
  app.post('/api/ai/generate-news', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY belum dikonfigurasi di server.'
        });
      }

      const {
        topic,
        facts,
        category,
        tone = 'informatif dan resmi',
        targetAudience = 'anggota Paguyuban Arisan Bani P3N'
      } = req.body ?? {};

      if (typeof topic !== 'string' || !topic.trim()) {
        return res.status(400).json({
          error: 'Topik berita wajib diisi.'
        });
      }

      if (topic.length > 3000) {
        return res.status(400).json({
          error: 'Topik terlalu panjang.'
        });
      }

      if (typeof facts === 'string' && facts.length > 12000) {
        return res.status(400).json({
          error: 'Informasi/fakta terlalu panjang.'
        });
      }

      const ai = new GoogleGenAI({ apiKey });

      const prompt = `
Anda adalah asisten redaksi berita untuk website resmi Paguyuban Arisan Bani P3N.

Tugas Anda adalah membantu admin membuat DRAF berita berbahasa Indonesia yang:
- jelas, faktual, informatif, natural, dan mudah dibaca;
- tidak mengarang nama, tanggal, tempat, angka, jabatan, kutipan, hasil kegiatan, atau fakta apa pun;
- hanya menggunakan fakta yang diberikan admin;
- jika suatu fakta belum tersedia, jangan menebak;
- tidak membuat klaim bahwa berita pasti mendapat peringkat tertentu di Google;
- tidak menggunakan keyword stuffing;
- tidak membuat konten sensasional atau menyesatkan;
- ditulis untuk manusia terlebih dahulu, kemudian dioptimalkan secara wajar untuk mesin pencari;
- memiliki struktur yang nyaman dibaca di ponsel.

PENTING:
Jika informasi admin tidak cukup untuk memastikan sebuah fakta, tulis secara netral atau beri tanda [PERLU DIKONFIRMASI] pada bagian yang memang membutuhkan verifikasi admin.

HASIL HARUS BERBENTUK JSON VALID SAJA dengan struktur:
{
  "title": "judul berita",
  "content": "isi berita dalam HTML sederhana",
  "excerpt": "ringkasan maksimal sekitar 160 karakter",
  "category": "kategori",
  "seoTitle": "judul SEO maksimal sekitar 60 karakter",
  "metaDescription": "deskripsi meta sekitar 150-160 karakter",
  "focusKeyword": "frasa keyword utama",
  "keywords": ["keyword 1", "keyword 2", "keyword 3", "keyword 4", "keyword 5"],
  "slug": "slug-url-hanya-huruf-kecil-dan-tanda-minus",
  "altText": "teks alternatif foto yang relevan jika foto tersedia",
  "factCheckNotes": ["hal yang wajib diperiksa admin sebelum publikasi"]
}

Aturan content:
- Gunakan HTML sederhana seperti <p>, <h2>, <ul>, <li>, <strong>.
- Jangan menggunakan Markdown.
- Jangan menambahkan fakta dari pengetahuan umum jika tidak diperlukan.
- Jangan membuat kutipan langsung jika admin tidak memberikan kutipan.
- Jangan menyebut diri sebagai AI.
- Jangan menambahkan bagian yang tidak diminta.

TOPIK:
${topic.trim()}

FAKTA/INFORMASI DARI ADMIN:
${typeof facts === 'string' && facts.trim() ? facts.trim() : '(Belum ada fakta tambahan. Jangan mengarang fakta.)'}

KATEGORI:
${typeof category === 'string' && category.trim() ? category.trim() : 'Umum'}

GAYA:
${typeof tone === 'string' && tone.trim() ? tone.trim() : 'informatif dan resmi'}

TARGET PEMBACA:
${typeof targetAudience === 'string' && targetAudience.trim() ? targetAudience.trim() : 'anggota Paguyuban Arisan Bani P3N'}
`;

      const models = [
        'gemini-3.6-flash',
        'gemini-3.5-flash',
      ];

      let response;
      let lastError;

      for (const model of models) {
        try {
          console.log(`AI news generation: mencoba model ${model}`);

          response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.4,
              maxOutputTokens: 4000
            }
          });

          console.log(`AI news generation: berhasil dengan model ${model}`);
          break;
        } catch (error) {
          lastError = error;

          const status = error?.status;

          console.warn(
            `AI news generation: model ${model} gagal` +
            (status ? ` (HTTP ${status})` : '')
          );

          if (status !== 503 && status !== 429) {
            throw error;
          }
        }
      }

      if (!response) {
        throw lastError || new Error(
          'Semua model Gemini gagal menghasilkan berita.'
        );
      }

      const raw = response.text?.trim();

      if (!raw) {
        return res.status(502).json({
          error: 'AI tidak mengembalikan hasil.'
        });
      }

      let result;

      try {
        result = JSON.parse(raw);
      } catch {
        return res.status(502).json({
          error: 'Hasil AI bukan JSON yang valid.'
        });
      }

      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('AI news generation error:', error);

      return res.status(500).json({
        error: 'Gagal membuat draf berita dengan AI.'
      });
    }
  });

  // Live Member News RSS Proxy
  // Mengambil berita langsung dari RSS resmi ANTARA.
  const memberNewsFeeds: Record<string, { label: string; url: string }> = {
    terkini: {
      label: 'Terkini',
      url: 'https://www.antaranews.com/rss/terkini.xml',
    },
    viral: {
      label: 'Terpopuler',
      url: 'https://www.antaranews.com/rss/top-news.xml',
    },
    nasional: {
      label: 'Nasional',
      url: 'https://www.antaranews.com/rss/terkini.xml',
    },
    politik: {
      label: 'Politik',
      url: 'https://www.antaranews.com/rss/politik.xml',
    },
    ekonomi: {
      label: 'Ekonomi',
      url: 'https://www.antaranews.com/rss/ekonomi.xml',
    },
    olahraga: {
      label: 'Olahraga',
      url: 'https://www.antaranews.com/rss/olahraga.xml',
    },
    teknologi: {
      label: 'Teknologi',
      url: 'https://www.antaranews.com/rss/tekno.xml',
    },
    hiburan: {
      label: 'Hiburan',
      url: 'https://www.antaranews.com/rss/hiburan.xml',
    },
    dunia: {
      label: 'Dunia',
      url: 'https://www.antaranews.com/rss/dunia.xml',
    },
    kesehatan: {
      label: 'Kesehatan',
      url: 'https://www.antaranews.com/rss/humaniora.xml',
    },
    lifestyle: {
      label: 'Lifestyle',
      url: 'https://www.antaranews.com/rss/lifestyle.xml',
    },
    otomotif: {
      label: 'Otomotif',
      url: 'https://www.antaranews.com/rss/otomotif.xml',
    },
    hukum: {
      label: 'Hukum',
      url: 'https://www.antaranews.com/rss/hukum.xml',
    },
  };

  const decodeXml = (value: string) =>
    value
      .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');

  const stripHtml = (value: string) =>
    decodeXml(value)
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const readXmlTag = (xml: string, tag: string) => {
    const match = xml.match(
      new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i')
    );
    return match ? decodeXml(match[1].trim()) : '';
  };

  app.get('/api/member-news', async (req, res) => {
    const category = String(req.query.category || 'terkini').trim().toLowerCase();
    const feed = memberNewsFeeds[category] || memberNewsFeeds.terkini;

    try {
      const response = await fetch(feed.url, {
        headers: {
          'User-Agent': 'PaguyubanNewsPortal/1.0',
          Accept: 'application/rss+xml, application/xml, text/xml',
        },
        signal: AbortSignal.timeout(12000),
      });

      if (!response.ok) {
        return res.status(502).json({
          error: `Sumber berita tidak dapat diakses (${response.status}).`,
        });
      }

      const xml = await response.text();
      const itemMatches = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) || [];

      const data = itemMatches
        .map((itemXml) => {
          const title = stripHtml(readXmlTag(itemXml, 'title'));
          const description = stripHtml(readXmlTag(itemXml, 'description'));
          const link = readXmlTag(itemXml, 'link');
          const pubDate = readXmlTag(itemXml, 'pubDate');
          const author =
            readXmlTag(itemXml, 'dc:creator') ||
            readXmlTag(itemXml, 'creator');

          const enclosure = itemXml.match(
            /<enclosure[^>]+url=["']([^"']+)["'][^>]*>/i
          );
          const mediaContent = itemXml.match(
            /<media:content[^>]+url=["']([^"']+)["'][^>]*>/i
          );
          const image =
            enclosure?.[1] ||
            mediaContent?.[1] ||
            '';

          return {
            title,
            description,
            image,
            link,
            pubDate,
            author,
            category: feed.label,
            source: 'ANTARA News',
          };
        })
        .filter((item) => item.title && item.link)
        .slice(0, 20);

      return res.json({
        success: true,
        category,
        source: feed.label,
        updatedAt: new Date().toISOString(),
        data,
      });
    } catch (error) {
      console.error('Member news RSS error:', error);

      return res.status(502).json({
        error: 'Gagal mengambil berita terbaru dari sumber internet.',
      });
    }
  });

  // Vite middleware for development vs Static assets for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: 3000 },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
