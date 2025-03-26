// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require("sharp");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");

const baseDir = path.join(process.cwd(), "public/assets/posts");

const folders = fs.readdirSync(baseDir);
folders.forEach((folder) => {
  const folderPath = path.join(baseDir, folder);
  const files = fs.readdirSync(folderPath);

  files.forEach((file) => {
    if (/\.(jpg|jpeg|png)$/i.test(file)) {
      const ext = path.extname(file);
      const baseName = path.basename(file, ext);
      const inputPath = path.join(folderPath, file);
      const outputPath = path.join(folderPath, `${baseName}-optimized.webp`);

      if (baseName.endsWith("-optimized") || fs.existsSync(outputPath)) {
        return;
      }

      const isThumbnail = baseName.toLowerCase().includes("thumbnail");

      let pipeline = sharp(inputPath);
      if (isThumbnail) {
        pipeline = pipeline.resize({ width: 800 });
      }

      pipeline
        .webp({
          quality: 90, // lighthouse performance 에서 image size issue 뜨면 85로 낮출 것
          nearLossless: true,
          smartSubsample: true,
        })
        .toFile(outputPath)
        .then(() => {
          console.log(`✅ Optimized: ${outputPath}`);

          // 기존 이미지 삭제
          fs.unlink(inputPath, (err) => {
            if (err) {
              console.error(
                `❌ Failed to delete original image: ${inputPath}`,
                err
              );
            } else {
              console.log(`🗑️ Deleted original: ${inputPath}`);
            }
          });
        })
        .catch((err) => console.error(`❌ Error: ${err}`));
    }
  });
});
