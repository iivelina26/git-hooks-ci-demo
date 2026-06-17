const fs = require("fs");
const path = require("path");
const glob = require("glob");

function replaceVersion() {
  const kSimVersion = process.env.K_SIM_VERSION || "3.2.0";
  console.log(`Replacing version placeholders with: ${kSimVersion}`);

  const markdownFiles = glob.sync("../docs/**/*.md", { cwd: __dirname });

  markdownFiles.forEach((file) => {
    const fullPath = path.resolve(__dirname, file);

    try {
      let content = fs.readFileSync(fullPath, "utf8");

      const updatedContent = content.replace(/K_SIM_VERSION/g, kSimVersion);

      if (content !== updatedContent) {
        fs.writeFileSync(fullPath, updatedContent, "utf8");
        console.log(
          `Updated version in: ${path.relative(process.cwd(), fullPath)}`,
        );
      }
    } catch (error) {
      console.error(`Error processing ${file}: ${error.message}`);
    }
  });

  console.log("Version replacement completed");
}

replaceVersion();
