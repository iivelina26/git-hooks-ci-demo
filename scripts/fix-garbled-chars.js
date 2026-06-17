const fs = require("fs");
const path = require("path");

// Mojibake sequences: UTF-8 bytes of Windows-1252 characters misread as Latin-1 then re-encoded
// U+00E2 + U+20AC + U+201C  (en dash –  mojibake)
// U+00E2 + U+20AC + U+201D  (em dash —  mojibake)
const GARBLED_DASH_EN = "\u00e2\u20ac\u201c";
const GARBLED_DASH_EM = "\u00e2\u20ac\u201d";

const dir = "c:\\SourceFiles\\Docs\\docs\\en";
const mdFiles = [];

function walk(d) {
  for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
    const full = path.join(d, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".md")) mdFiles.push(full);
  }
}
walk(dir);

let totalFiles = 0,
  totalCount = 0;
for (const f of mdFiles) {
  let content = fs.readFileSync(f, "utf8");
  const countEn = content.split(GARBLED_DASH_EN).length - 1;
  const countEm = content.split(GARBLED_DASH_EM).length - 1;
  if (countEn + countEm === 0) continue;
  content = content.split(GARBLED_DASH_EN).join("");
  content = content.split(GARBLED_DASH_EM).join("");
  fs.writeFileSync(f, content, "utf8");
  console.log(
    `Updated: ${path.relative(dir, f)}  (${countEn + countEm} removed)`,
  );
  totalFiles++;
  totalCount += countEn + countEm;
}
console.log(
  `\nDone. ${totalCount} garbled dash(es) removed from ${totalFiles} file(s).`,
);
