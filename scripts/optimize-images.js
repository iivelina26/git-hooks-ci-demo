const imagemin = require("imagemin").default;
const imageminMozjpeg = require("imagemin-mozjpeg").default;
const imageminPngquant = require("imagemin-pngquant").default;
const imageminGifsicle = require("imagemin-gifsicle");
const imageminSvgo = require("imagemin-svgo").default;
const glob = require("glob");
const path = require("path");
const fs = require("fs-extra");

// Configuration for image optimization
const optimizationConfig = {
  jpeg: {
    quality: 85, // JPEG quality (0-100)
    progressive: true,
  },
  png: {
    quality: [0.6, 0.8], // PNG quality range
    speed: 4,
  },
  gif: {
    optimizationLevel: 3,
  },
  svg: {
    plugins: [
      {
        name: "preset-default",
        params: {
          overrides: {
            removeViewBox: false,
          },
        },
      },
    ],
  },
};

// Dynamically find all Images folders under docs
function findAllImagesFolders(rootDir) {
  const results = [];
  function search(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (entry.name === "Images") {
          results.push(path.join(dir, entry.name));
        } else {
          search(path.join(dir, entry.name));
        }
      }
    }
  }
  search(rootDir);
  return results;
}

// Get imagemin plugins configuration for specific file types
function getImageminPluginsForFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const plugins = [];

  switch (ext) {
    case ".jpg":
    case ".jpeg":
      plugins.push(
        imageminMozjpeg({
          quality: optimizationConfig.jpeg.quality,
          progressive: optimizationConfig.jpeg.progressive,
        }),
      );
      break;
    case ".png":
      plugins.push(
        imageminPngquant({
          quality: optimizationConfig.png.quality,
          speed: optimizationConfig.png.speed,
        }),
      );
      break;
    case ".gif":
      plugins.push(
        imageminGifsicle({
          optimizationLevel: optimizationConfig.gif.optimizationLevel,
        }),
      );
      break;
    case ".svg":
      plugins.push(imageminSvgo(optimizationConfig.svg));
      break;
  }

  return plugins;
}

// Optimize a single image file
async function optimizeSingleImage(inputPath, outputDir, imageFile, stats) {
  try {
    const plugins = getImageminPluginsForFile(inputPath);

    if (plugins.length === 0) {
      // Unsupported file type, just copy
      const outputPath = path.join(outputDir, imageFile);
      await fs.copy(inputPath, outputPath);
      console.log(`   📋 Copied ${imageFile} (unsupported format)`);
      return {
        success: false,
        sizeBefore: stats.sizeBefore,
        sizeAfter: stats.sizeBefore,
      };
    }

    const result = await imagemin([inputPath], {
      destination: outputDir,
      plugins: plugins,
    });

    if (result && result.length > 0) {
      const outputPath = path.join(outputDir, imageFile);
      if (await fs.pathExists(outputPath)) {
        const statsAfter = await fs.stat(outputPath);
        const reduction = (
          ((stats.sizeBefore - statsAfter.size) / stats.sizeBefore) *
          100
        ).toFixed(1);
        console.log(`   ✅ ${imageFile} (${reduction}% reduction)`);

        return {
          success: true,
          sizeBefore: stats.sizeBefore,
          sizeAfter: statsAfter.size,
        };
      }
    }
    return {
      success: false,
      sizeBefore: stats.sizeBefore,
      sizeAfter: stats.sizeBefore,
    };
  } catch (error) {
    console.error(`   ❌ Error optimizing ${imageFile}:`, error.message);
    // Copy original file if optimization fails
    try {
      const outputPath = path.join(outputDir, imageFile);
      await fs.copy(inputPath, outputPath);
      console.log(`   📋 Copied original ${imageFile} (optimization failed)`);
      return {
        success: false,
        sizeBefore: stats.sizeBefore,
        sizeAfter: stats.sizeBefore,
      };
    } catch (copyError) {
      console.error(`   ❌ Failed to copy ${imageFile}:`, copyError.message);
      return {
        success: false,
        sizeBefore: stats.sizeBefore,
        sizeAfter: stats.sizeBefore,
      };
    }
  }
}

// Process images in a section
async function processSection(section, panelsPath) {
  const sectionPath = path.join(panelsPath, section);
  const imagesPath = path.join(sectionPath, "Images");

  if (!(await fs.pathExists(imagesPath))) {
    console.log(`⚠️  Skipping ${section} - Images folder not found`);
    return { optimized: 0, sizeBefore: 0, sizeAfter: 0 };
  }

  const imageFiles = glob.sync("**/*.{jpg,jpeg,png,gif,svg}", {
    cwd: imagesPath,
    nodir: true,
    ignore: ["**/node_modules/**", "**/.git/**"],
  });

  if (imageFiles.length === 0) {
    console.log(`   ℹ️  No images found in ${section}`);
    return { optimized: 0, sizeBefore: 0, sizeAfter: 0 };
  }

  console.log(`\n📁 Processing section: ${section}`);
  console.log(`   📊 Found ${imageFiles.length} images to optimize`);

  let sectionOptimized = 0;
  let sectionSizeBefore = 0;
  let sectionSizeAfter = 0;

  const batchSize = 10;
  for (let i = 0; i < imageFiles.length; i += batchSize) {
    const batch = imageFiles.slice(i, i + batchSize);
    for (const imageFile of batch) {
      const inputPath = path.join(imagesPath, imageFile);
      const outputDir = path.dirname(inputPath);
      const statsBefore = await fs.stat(inputPath);
      const result = await optimizeSingleImage(
        inputPath,
        outputDir,
        path.basename(imageFile),
        { sizeBefore: statsBefore.size },
      );
      if (result.success) sectionOptimized++;
      sectionSizeBefore += result.sizeBefore;
      sectionSizeAfter += result.sizeAfter;
    }
  }

  console.log(`   ✨ Completed ${section}`);
  return {
    optimized: sectionOptimized,
    sizeBefore: sectionSizeBefore,
    sizeAfter: sectionSizeAfter,
  };
}

// Print optimization summary
function printSummary(totalOptimized, totalSizeBefore, totalSizeAfter) {
  console.log("\n📈 Optimization Summary:");
  console.log(`   📊 Total images optimized: ${totalOptimized}`);

  if (totalSizeBefore > 0) {
    const totalReduction = (
      ((totalSizeBefore - totalSizeAfter) / totalSizeBefore) *
      100
    ).toFixed(1);
    const sizeBefore = (totalSizeBefore / 1024 / 1024).toFixed(2);
    const sizeAfter = (totalSizeAfter / 1024 / 1024).toFixed(2);
    const spaceSaved = (sizeBefore - sizeAfter).toFixed(2);

    console.log(`   📏 Size before: ${sizeBefore} MB`);
    console.log(`   📏 Size after: ${sizeAfter} MB`);
    console.log(
      `   💾 Space saved: ${spaceSaved} MB (${totalReduction}% reduction)`,
    );
  }

  console.log("\n🎉 Image optimization completed!");
}

// Main optimization function
async function optimizeImages() {
  console.log("🚀 Starting image optimization process...");
  const docsPath = path.join(__dirname, "..", "docs");
  const imagesFolders = findAllImagesFolders(docsPath);
  if (imagesFolders.length === 0) {
    console.log("⚠️  No Images folders found under docs.");
    return;
  }
  console.log(`🔎 Found ${imagesFolders.length} Images folders.`);
  let totalOptimized = 0;
  let totalSizeBefore = 0;
  let totalSizeAfter = 0;
  for (const imagesPath of imagesFolders) {
    // Derive section name for reporting
    const section = path.relative(docsPath, path.dirname(imagesPath));
    try {
      const result = await processSection(
        section,
        path.join(__dirname, "..", "docs"),
      );
      totalOptimized += result.optimized;
      totalSizeBefore += result.sizeBefore;
      totalSizeAfter += result.sizeAfter;
    } catch (error) {
      console.error(`❌ Error processing section ${section}:`, error.message);
    }
  }
  printSummary(totalOptimized, totalSizeBefore, totalSizeAfter);
}

// Handle errors
process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled error:", error);
  process.exit(1);
});

// Run the optimization
optimizeImages().catch((error) => {
  console.error("❌ Failed to optimize images:", error);
  process.exit(1);
});
