import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const sitemapPath = path.join(projectRoot, 'public', 'sitemap.xml');

const firebaseConfigPath = path.join(
  projectRoot,
  'firebase-applet-config.json'
);

const SITE_URL = 'https://paguyubanarisanbanip3n.my.id';

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .replace(/^\/+|\/+$/g, '');
}

function toIsoDate(value) {
  if (!value) return '';

  const date = value instanceof Date
    ? value
    : new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return date.toISOString();
}

async function main() {
  console.log('SITEMAP GENERATOR');
  console.log('SITE:', SITE_URL);

  if (!fs.existsSync(firebaseConfigPath)) {
    throw new Error(
      'firebase-applet-config.json tidak ditemukan.'
    );
  }

  const firebaseConfig = JSON.parse(
    fs.readFileSync(firebaseConfigPath, 'utf8')
  );

  const { initializeApp } = await import('firebase/app');
  const {
    getFirestore,
    collection,
    getDocs,
    query,
    where,
  } = await import('firebase/firestore');

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const newsSnapshot = await getDocs(
    query(
      collection(db, 'news'),
      where('status', '==', 'published')
    )
  );

  const urls = [
    {
      loc: `${SITE_URL}/`,
      priority: '1.0',
    },
    {
      loc: `${SITE_URL}/berita`,
      priority: '0.9',
    },
  ];

  const seenSlugs = new Set();

  newsSnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const slug = normalizeSlug(data.slug);

    if (!slug || seenSlugs.has(slug)) {
      return;
    }

    seenSlugs.add(slug);

    const lastmod =
      toIsoDate(data.publishedAt?.toDate?.()) ||
      toIsoDate(data.updatedAt?.toDate?.()) ||
      toIsoDate(data.createdAt?.toDate?.());

    urls.push({
      loc: `${SITE_URL}/berita/${encodeURIComponent(slug)}`,
      lastmod,
      priority: '0.8',
    });
  });

  urls.sort((a, b) => {
    if (a.loc === `${SITE_URL}/`) return -1;
    if (b.loc === `${SITE_URL}/`) return 1;
    if (a.loc === `${SITE_URL}/berita`) return -1;
    if (b.loc === `${SITE_URL}/berita`) return 1;

    return a.loc.localeCompare(b.loc);
  });

  const body = urls
    .map((item) => {
      const lastmod = item.lastmod
        ? `\n    <lastmod>${escapeXml(item.lastmod)}</lastmod>`
        : '';

      return `  <url>
    <loc>${escapeXml(item.loc)}</loc>${lastmod}
    <priority>${item.priority}</priority>
  </url>`;
    })
    .join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

  fs.writeFileSync(sitemapPath, sitemap, 'utf8');

  console.log('BERITA PUBLISHED :', newsSnapshot.size);
  console.log('URL SITEMAP      :', urls.length);
  console.log('SITEMAP           :', sitemapPath);
  console.log('SITEMAP GENERATOR : BERHASIL');
}

main().catch((error) => {
  console.error('SITEMAP GENERATOR : GAGAL');
  console.error(error?.message || error);
  process.exitCode = 1;
});
