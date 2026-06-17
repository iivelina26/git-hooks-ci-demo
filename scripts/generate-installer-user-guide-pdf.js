const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer");

(async () => {
  const siteRoot = path.resolve(__dirname, "..", "docfx", "_site");
  const relDir = path.join("User Guides", "Installer User Guide");
  const htmlFile = path.join(
    siteRoot,
    relDir,
    "Docs Installer User Guide.html",
  );

  const outInSite = path.join(
    siteRoot,
    relDir,
    "Docs Installer User Guide.pdf",
  );
  const outInSource = path.resolve(
    __dirname,
    "..",
    "docs",
    "User Guides",
    "Installer User Guide",
    "Docs Installer User Guide.pdf",
  );

  if (!fs.existsSync(htmlFile)) {
    console.error("HTML file not found:", htmlFile);
    console.error('Run "npm run build-docs" first.');
    process.exit(2);
  }

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  const url = "file://" + htmlFile.replace(/\\/g, "/");
  await page.goto(url, { waitUntil: "networkidle0" });
  await page.setViewport({ width: 1200, height: 800 });

  const pdfOptions = {
    format: "A4",
    printBackground: true,
    displayHeaderFooter: false,
    margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
  };

  await page.pdf({ ...pdfOptions, path: outInSite });
  await page.pdf({ ...pdfOptions, path: outInSource });

  await browser.close();

  console.log("Saved PDF to:");
  console.log("-", outInSource);
  console.log("-", outInSite);
})();
