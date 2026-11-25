// Removes the review markers for good once James has approved the wording (see src/lib/review.ts):
// ⟪removed text⟫ is deleted and ⟦new text⟧ is kept without its brackets.
//   node scripts/strip-review-marks.js
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "src");
const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name) && !full.endsWith(path.join("lib", "review.ts"))) files.push(full);
  }
})(root);

for (const file of files) {
  const before = fs.readFileSync(file, "utf8");
  if (!/[⟦⟪]/.test(before)) continue;
  // Whole lines that only held removed wording (a list entry like  "⟪…⟫",) go completely.
  const after = before
    .replace(/^[ \t]*"⟪[^⟫]*⟫",?\n/gm, "")
    .replace(/ ?⟪[^⟫]*⟫/g, "")
    .replace(/[⟦⟧]/g, "");
  fs.writeFileSync(file, after);
  console.log("Cleaned " + path.relative(path.join(__dirname, ".."), file));
}
