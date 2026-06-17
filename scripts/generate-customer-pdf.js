const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer");

(async () => {
  const siteRoot = path.resolve(__dirname, "..", "docfx", "_site");
  const relDir = path.join("RELEASE_NOTES", "External Release Notes");
  const htmlFile = path.join(siteRoot, relDir, "Customer Release Notes.html");
  const outFile = path.join(siteRoot, relDir, "Customer Release Notes.pdf");

  if (!fs.existsSync(htmlFile)) {
    console.error("HTML file not found:", htmlFile);
    process.exit(2);
  }

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  // Use file:// URL to open the local HTML
  const url = "file://" + htmlFile.replace(/\\/g, "/");
  await page.goto(url, { waitUntil: "networkidle0" });

  // Optional: increase viewport width for better PDF layout
  await page.setViewport({ width: 1200, height: 800 });

  await page.pdf({
    path: outFile,
    format: "A4",
    printBackground: true,
    displayHeaderFooter: false,
    margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
  });

  await browser.close();
  console.log("Saved PDF to", outFile);
})();
