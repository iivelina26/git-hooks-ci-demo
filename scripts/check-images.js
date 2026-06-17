const glob = require("glob");
const path = require("path");
const fs = require("fs-extra");

// Define the sections that have Images folders
const sections = [
  "Emulated Kelvin Hughes Manta",
  "Emulated Radar Sharpeye",
  "Inmarsat-C",
  "Instructor User Guide",
  "LifeBuoyAndPyrotechnics",
  "Polaris Radar ARPA",
  "Student User Guide",
];

async function checkImageStatus() {
  console.log("📊 Checking image status across all sections...\n");

  const panelsPath = path.join(__dirname, "..", "Panels");
  let totalOriginImages = 0;
  let totalOptimizedImages = 0;
  let totalOriginSize = 0;
  let totalOptimizedSize = 0;

  for (const section of sections) {
    const sectionPath = path.join(panelsPath, section);
    const imagesOriginPath = path.join(sectionPath, "Images-origin");
    const imagesPath = path.join(sectionPath, "Images");

    console.log(`\n📁 Section: ${section}`);

    // Check Images-origin folder
    if (await fs.pathExists(imagesOriginPath)) {
      const originFiles = glob.sync("**/*.{jpg,jpeg,png,gif,svg}", {
        cwd: imagesOriginPath,
        nodir: true,
      });

      let originSize = 0;
      for (const file of originFiles) {
        const filePath = path.join(imagesOriginPath, file);
        const stats = await fs.stat(filePath);
        originSize += stats.size;
      }

      totalOriginImages += originFiles.length;
      totalOriginSize += originSize;

      console.log(
        `   📷 Images-origin: ${originFiles.length} files (${(originSize / 1024 / 1024).toFixed(2)} MB)`,
      );
    } else {
      console.log(`   ⚠️  Images-origin: Folder not found`);
    }

    // Check Images folder
    if (await fs.pathExists(imagesPath)) {
      const optimizedFiles = glob.sync("**/*.{jpg,jpeg,png,gif,svg}", {
        cwd: imagesPath,
        nodir: true,
      });

      let optimizedSize = 0;
      for (const file of optimizedFiles) {
        const filePath = path.join(imagesPath, file);
        if (await fs.pathExists(filePath)) {
          const stats = await fs.stat(filePath);
          optimizedSize += stats.size;
        }
      }

      totalOptimizedImages += optimizedFiles.length;
      totalOptimizedSize += optimizedSize;

      console.log(
        `   ✨ Images: ${optimizedFiles.length} files (${(optimizedSize / 1024 / 1024).toFixed(2)} MB)`,
      );
    } else {
      console.log(`   ⚠️  Images: Folder not found`);
    }
  }

  // Print summary
  console.log("\n" + "=".repeat(50));
  console.log("📈 SUMMARY");
  console.log("=".repeat(50));
  console.log(`📷 Total original images: ${totalOriginImages} files`);
  console.log(`✨ Total optimized images: ${totalOptimizedImages} files`);
  console.log(
    `📏 Original total size: ${(totalOriginSize / 1024 / 1024).toFixed(2)} MB`,
  );
  console.log(
    `📏 Optimized total size: ${(totalOptimizedSize / 1024 / 1024).toFixed(2)} MB`,
  );

  if (totalOriginSize > 0 && totalOptimizedSize > 0) {
    const savings = totalOriginSize - totalOptimizedSize;
    const savingsPercent = ((savings / totalOriginSize) * 100).toFixed(1);
    console.log(
      `💾 Space saved: ${(savings / 1024 / 1024).toFixed(2)} MB (${savingsPercent}%)`,
    );
  }

  // Check status
  if (totalOptimizedImages === 0) {
    console.log(
      '\n⚠️  No optimized images found. Run "npm run optimize-images" to optimize.',
    );
  } else if (totalOptimizedImages < totalOriginImages) {
    console.log(
      '\n⚠️  Some images may need optimization. Run "npm run optimize-images" to update.',
    );
  } else {
    console.log("\n✅ All images appear to be optimized!");
  }
}

// Run the check
checkImageStatus().catch((error) => {
  console.error("❌ Failed to check image status:", error);
  process.exit(1);
});
