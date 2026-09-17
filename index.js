#!/usr/bin/node
import express from "express";
import path from "path";
import { fileURLToPath } from 'url';
import { readFile, readdir } from 'fs/promises';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static('public')); 
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/favicon.ico', (req, res) => res.status(204).end());

// Secure PDF download endpoint using book slug
app.get('/download/:slug', async (req, res) => {
    try {
        const slug = req.params.slug;
        if (!slug || typeof slug !== 'string') {
            return res.status(400).send('Invalid file identifier');
        }

        // Prevent path traversal
        const safeSlug = path.basename(slug.trim());
        if (safeSlug !== slug || slug.includes('..') || slug.includes('/') || slug.includes('\\')) {
            return res.status(400).send('Invalid file path');
        }

        const uploadsDir = path.resolve(__dirname, 'uploads');
        const files = await readdir(uploadsDir);

        // Find matching PDF file case-insensitively
        const targetPdf = `${safeSlug}.pdf`.toLowerCase();
        const matchedFile = files.find(f => f.toLowerCase() === targetPdf && f.toLowerCase().endsWith('.pdf'));

        if (!matchedFile) {
            return res.status(404).send('PDF file not found in library');
        }

        const fullPath = path.join(uploadsDir, matchedFile);
        const resolvedPath = path.resolve(fullPath);

        // Security check: ensure path is strictly inside uploads folder
        if (!resolvedPath.startsWith(uploadsDir)) {
            return res.status(403).send('Access denied');
        }

        // Download securely
        res.download(resolvedPath, matchedFile);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).send('Server Error during download');
    }
});

app.get('/', async (req, res) => {
    try {
        const metaPath = path.join(__dirname, 'meta_dt.json');
        const rawData = await readFile(metaPath, 'utf8');
        const books = JSON.parse(rawData); 
        const bookList = Object.values(books);

        // Collect unique tags from books and include common category tags requested
        const defaultCategories = ['python', 'git', 'os', 'js', 'cn', 'c++', 'c', 'go'];
        const dynamicTags = bookList.map(b => (b.tag || '').trim().toLowerCase()).filter(Boolean);
        const allTags = Array.from(new Set([...defaultCategories, ...dynamicTags]));

        res.render("index.ejs", { books: bookList, tags: allTags });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).send("Server Error");
    }
});

app.listen("8080", () => {
    console.log("Index is listening at 8080");
});