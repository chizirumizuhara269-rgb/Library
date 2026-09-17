#!/usr/bin/node
import express from "express";
import path from "path";
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json())
app.use(express.static('public')); 
app.use(express.urlencoded({ extended: true }));
app.set('view engine','ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/favicon.ico', (req, res) => res.status(204).end());

app.get('/', async (req, res) => {
    try {
        // Read the file directly from the filesystem
        const rawData = await readFile('/home/vishwas/Desktop/library/meta_dt.json', 'utf8');
        const books= JSON.parse(rawData); 

        res.render("index.ejs", {books: Object.values(books)});
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).send("Server Error");
    }
});


app.listen("8080" ,()=>{
    console.log("Index is listning at 8080");
});