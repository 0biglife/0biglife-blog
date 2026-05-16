import fs from "fs";
import path from "path";

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
