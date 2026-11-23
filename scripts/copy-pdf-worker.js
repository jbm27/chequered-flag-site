// Copies pdf.js's background worker into public/ before each build, so the licence upload can read PDFs.
// Next.js can't bundle this file itself. It's copied rather than committed so it always matches the
// installed pdfjs-dist version.
const fs = require("fs");
const path = require("path");

const from = path.join(__dirname, "..", "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.min.mjs");
const to = path.join(__dirname, "..", "public", "pdf.worker.min.mjs");
fs.copyFileSync(from, to);
console.log("Copied the pdf.js worker to public/pdf.worker.min.mjs");
