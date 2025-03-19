// mdx file test를 위한 임시 파일
// node test.mjs로 run
import { compile } from "@mdx-js/mdx";
import fs from "fs/promises";

(async () => {
  try {
    const mdxContent = await fs.readFile(
      "./content/posts/first-post/index.mdx",
      "utf-8"
    );
    const compiled = await compile(mdxContent);
    console.log("✅ MDX 컴파일 성공:", compiled);
  } catch (error) {
    console.error("❌ MDX 컴파일 오류:", error);
  }
})();
