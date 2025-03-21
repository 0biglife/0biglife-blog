import fs from "fs";
import path from "path";
import sharp from "sharp";

const imageDir = path.join(process.cwd(), "public/assets");

// 이미지 최적화 및 WebP 변환
const optimizeImages = (dir: string) => {
  fs.readdirSync(dir).forEach((folder) => {
    const folderPath = path.join(dir, folder);
    if (fs.statSync(folderPath).isDirectory()) {
      fs.readdirSync(folderPath).forEach((file) => {
        const filePath = path.join(folderPath, file);
        const ext = path.extname(file).toLowerCase();

        if (ext === ".jpg" || ext === ".jpeg" || ext === ".png") {
          const webpPath = filePath.replace(ext, ".webp");
          const optimizedPath = filePath.replace(ext, "-optimized" + ext);

          // 이미 최적화된 파일이 있으면 변환하지 않음
          if (fs.existsSync(webpPath) || fs.existsSync(optimizedPath)) {
            console.log(`✅ Skipping (already optimized): ${filePath}`);
            return;
          }

          // 1️⃣ 먼저 800px 이하로 리사이징하여 최적화된 파일 생성
          sharp(filePath)
            .resize({ width: 800 }) // ✅ 800px 너비로 리사이징
            .toFile(optimizedPath)
            .then(() =>
              // 2️⃣ 최적화된 파일을 WebP로 변환
              sharp(optimizedPath)
                .toFormat("webp", { quality: 85 }) // ✅ WebP 변환, 품질 85%
                .toFile(webpPath)
            )
            .then(() =>
              console.log(
                `✅ Optimized & Converted: ${filePath} -> ${webpPath}`
              )
            )
            .catch((err) =>
              console.error(`❌ Error processing ${filePath}:`, err)
            );
        }
      });
    }
  });
};

// 실행
optimizeImages(imageDir);
console.log("🎉 All images optimized and converted to WebP!");
