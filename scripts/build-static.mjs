import { readFile, mkdir, cp, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import ejs from 'ejs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

async function build() {
  console.log('Building static site for GitHub Pages...');

  await mkdir(distDir, { recursive: true });

  // Load books metadata
  const metaPath = path.join(rootDir, 'meta_dt.json');
  const rawData = await readFile(metaPath, 'utf8');
  const books = JSON.parse(rawData);
  const bookList = Object.values(books);

  const defaultCategories = ['python', 'git', 'os', 'js', 'cn', 'c++', 'c', 'go'];
  const dynamicTags = bookList.map(b => (b.tag || '').trim().toLowerCase()).filter(Boolean);
  const allTags = Array.from(new Set([...defaultCategories, ...dynamicTags]));

  // Render index.ejs to HTML
  const templatePath = path.join(rootDir, 'views', 'index.ejs');
  const html = await ejs.renderFile(templatePath, { books: bookList, tags: allTags });

  // Adjust absolute download links for GitHub Pages (relative) if needed
  // Keep as-is for custom domain; for project pages, relative links work better.
  // We copy PDFs to dist/uploads and keep href as uploads/<slug>.pdf for static compatibility
  // but also keep /download/ route fallback via 404.html if needed.
  // For now, replace /download/ with uploads/ + .pdf for static hosting
  const staticHtml = html.replaceAll('/download/', 'uploads/').replaceAll('.pdf"', '.pdf"');

  // Ensure links end with .pdf for static files
  // The EJS generates href="/download/<slug>" and download="<slug>.pdf"
  // We transform to href="uploads/<slug>.pdf"
  const finalHtml = staticHtml.replace(/href="uploads\/([^"]+)"/g, (match, slug) => {
    // if slug already ends with .pdf keep it, else add
    if (slug.endsWith('.pdf')) return match;
    return `href="uploads/${slug}.pdf"`;
  });

  await writeFile(path.join(distDir, 'index.html'), finalHtml, 'utf8');
  console.log(' -> dist/index.html generated');

  // Copy uploads (PDFs) to dist/uploads
  try {
    await cp(path.join(rootDir, 'uploads'), path.join(distDir, 'uploads'), { recursive: true });
    console.log(' -> uploads copied');
  } catch (e) {
    console.warn('No uploads to copy or copy failed:', e.message);
  }

  // Copy public assets if any
  try {
    await cp(path.join(rootDir, 'public'), path.join(distDir, 'public'), { recursive: true });
    console.log(' -> public copied');
  } catch (e) {
    // public may be empty
  }

  // Copy public contents to dist root as well (if public has assets)
  // Create .nojekyll to bypass Jekyll processing
  await writeFile(path.join(distDir, '.nojekyll'), '', 'utf8');

  // Create 404.html fallback (copy of index for SPA-like)
  await writeFile(path.join(distDir, '404.html'), finalHtml, 'utf8');

  console.log('Build complete: dist/');
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
