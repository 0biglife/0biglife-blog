import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { ZipArchive } from "archiver";

const LANG = {
  ".html": "html", ".css": "css", ".js": "javascript",
  ".mjs": "javascript", ".json": "json", ".ts": "typescript",
  ".glsl": "glsl", ".frag": "glsl", ".vert": "glsl", ".md": "markdown",
};

export function langForExt(ext) {
  return LANG[ext.toLowerCase()] ?? "text";
}

// dir 하위 모든 파일을 dir 기준 상대경로 배열로 반환
export function walkFiles(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full, base));
    else out.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return out;
}

// manifest에서 제외할 바이너리/미디어 확장자 (소문자 비교)
const BINARY_EXTS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg",
  ".mp4", ".mov", ".webm", ".ico",
  ".woff", ".woff2", ".ttf",
]);

const CONTENT_WORKS_DIR = path.join(process.cwd(), "content", "works");
const PUBLIC_WORKS_DIR = path.join(process.cwd(), "public", "works");

// demo 폴더를 walk 하여 텍스트 파일만 담은 manifest 객체 생성
function buildManifest(demoDir) {
  const files = [];
  for (const rel of walkFiles(demoDir)) {
    const ext = path.extname(rel);
    if (BINARY_EXTS.has(ext.toLowerCase())) continue; // 바이너리는 manifest 제외
    const content = fs.readFileSync(path.join(demoDir, rel), "utf8");
    files.push({ path: rel, content, lang: langForExt(ext) });
  }
  return { files };
}

// demo 폴더 내용을 루트로 하는 zip 파일 생성 (Promise 반환)
function createZip(demoDir, zipPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    output.on("close", resolve);
    archive.on("error", reject);

    archive.pipe(output);
    // false → demo/ 중첩 없이 demo 내용이 zip 루트에 위치
    archive.directory(demoDir, false);
    archive.finalize();
  });
}

// content/works/*/ 를 순회하며 데모 복사 + manifest + zip 생성
export async function buildAll() {
  if (!fs.existsSync(CONTENT_WORKS_DIR)) {
    console.log("build-works: 0 work(s) processed");
    return;
  }

  const slugs = fs
    .readdirSync(CONTENT_WORKS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  let processed = 0;

  for (const slug of slugs) {
    const workDir = path.join(CONTENT_WORKS_DIR, slug);
    const demoDir = path.join(workDir, "demo");

    // 1. demo 폴더 없으면 스킵 + 경고
    if (!fs.existsSync(demoDir) || !fs.statSync(demoDir).isDirectory()) {
      console.warn(`build-works: skipping "${slug}" — no demo/ folder`);
      continue;
    }

    // 2. public/works/<slug>/ 초기화 후 demo 복사
    const outDir = path.join(PUBLIC_WORKS_DIR, slug);
    fs.rmSync(outDir, { recursive: true, force: true });
    fs.mkdirSync(outDir, { recursive: true });
    fs.cpSync(demoDir, path.join(outDir, "demo"), { recursive: true });

    // 3. cover.png 있으면 복사
    const coverSrc = path.join(workDir, "cover.png");
    if (fs.existsSync(coverSrc)) {
      fs.copyFileSync(coverSrc, path.join(outDir, "cover.png"));
    }

    // 4. manifest.json 생성
    const manifest = buildManifest(demoDir);
    fs.writeFileSync(
      path.join(outDir, "manifest.json"),
      JSON.stringify(manifest, null, 2),
    );

    // 5. <slug>.zip 생성 (demo 내용이 zip 루트)
    await createZip(demoDir, path.join(outDir, `${slug}.zip`));

    processed += 1;
  }

  // 6. 요약 출력
  console.log(`build-works: ${processed} work(s) processed`);
}

// 7. 직접 실행될 때만 buildAll() 호출 (테스트 import 시에는 실행 안 함)
if (import.meta.url === pathToFileURL(process.argv[1]).href) buildAll();
