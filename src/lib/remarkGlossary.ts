/**
 * 본문에 등장하는 자율주행 용어를 자동으로 <Term> 으로 감싸는 remark 플러그인.
 *
 * MDX 원고를 손대지 않는 쪽을 택했다. 용어를 일일이 <Term id="..."> 으로
 * 감싸면 글 11편을 전부 고쳐야 하고, 새 용어를 추가할 때마다 또 고쳐야 한다.
 * 사전에 항목 하나를 넣으면 과거 글에도 소급 적용되는 편이 유지 비용이 낮다.
 *
 * 남용을 막는 규칙 두 가지 —
 *  - 같은 용어는 h2 섹션마다 첫 등장 한 번만 (섹션이 바뀌면 다시 한 번)
 *  - 그래도 글 전체에서 MAX_PER_POST 회를 넘지 않는다
 *
 * 코드·링크·제목 안에서는 절대 감싸지 않는다. 특히 제목(heading)은
 * MarkdownRenderer 가 children 이 문자열일 때만 id 를 만들어 목차 앵커를
 * 걸기 때문에, 여기에 엘리먼트를 끼우면 TOC 가 조용히 깨진다.
 */

import { matchPatterns } from "./glossary";

const MAX_PER_POST = 3;

/** 이 노드 안쪽은 아예 들어가지 않는다 */
const OPAQUE = new Set([
  "code",
  "inlineCode",
  "heading",
  "link",
  "linkReference",
  "definition",
  "image",
  "imageReference",
  "html",
  "yaml",
  "mdxjsEsm",
  "mdxFlowExpression",
  "mdxTextExpression",
  "mdxJsxTextElement",
  "mdxJsxFlowElement",
]);

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isAsciiWord = (ch: string) => /[A-Za-z0-9_]/.test(ch);

/** 한 번만 만들어 재사용 (모듈 로드 시 1회) */
function build() {
  const entries = matchPatterns();
  const byText = new Map<string, string>();
  const alts: string[] = [];

  for (const { pattern, id } of entries) {
    // 같은 표기가 두 항목에 겹치면 먼저 등록된 쪽(더 긴 표기)을 남긴다
    if (byText.has(pattern)) continue;
    byText.set(pattern, id);

    // 경계 처리: 영숫자로 시작/끝나는 표기에만 단어 경계를 건다.
    // 한글에 경계를 걸면 조사("씬 데이터를")에서 매칭이 끊긴다.
    const head = isAsciiWord(pattern[0]) ? "(?<![A-Za-z0-9_])" : "";
    const tail = isAsciiWord(pattern[pattern.length - 1]) ? "(?![A-Za-z0-9_])" : "";
    alts.push(`${head}${escapeRe(pattern)}${tail}`);
  }

  return { byText, regex: new RegExp(alts.join("|"), "g") };
}

const { byText, regex } = build();

type AnyNode = { type: string; value?: string; children?: AnyNode[]; depth?: number };

function termNode(id: string, text: string) {
  return {
    type: "mdxJsxTextElement",
    name: "Term",
    attributes: [{ type: "mdxJsxAttribute", name: "id", value: id }],
    children: [{ type: "text", value: text }],
  };
}

export function remarkGlossary(options: { enabled?: boolean } = {}) {
  return (tree: AnyNode) => {
    if (options.enabled === false) return;

    const totalUsed = new Map<string, number>();
    let sectionUsed = new Set<string>();

    /** 텍스트 노드 하나를 [text, Term, text, ...] 로 쪼갠다. 안 잡히면 null */
    const split = (value: string): AnyNode[] | null => {
      regex.lastIndex = 0;
      let out: AnyNode[] | null = null;
      let cursor = 0;
      let m: RegExpExecArray | null;

      while ((m = regex.exec(value)) !== null) {
        const hit = m[0];
        const id = byText.get(hit);
        if (!id) continue;
        if (sectionUsed.has(id)) continue;
        if ((totalUsed.get(id) ?? 0) >= MAX_PER_POST) continue;

        sectionUsed.add(id);
        totalUsed.set(id, (totalUsed.get(id) ?? 0) + 1);

        out ??= [];
        if (m.index > cursor) out.push({ type: "text", value: value.slice(cursor, m.index) });
        out.push(termNode(id, hit) as AnyNode);
        cursor = m.index + hit.length;
      }

      if (!out) return null;
      if (cursor < value.length) out.push({ type: "text", value: value.slice(cursor) });
      return out;
    };

    const walk = (node: AnyNode) => {
      if (!node.children) return;
      const next: AnyNode[] = [];

      for (const child of node.children) {
        if (child.type === "text" && typeof child.value === "string") {
          const parts = split(child.value);
          if (parts) next.push(...parts);
          else next.push(child);
          continue;
        }
        if (!OPAQUE.has(child.type)) walk(child);
        next.push(child);
      }

      node.children = next;
    };

    for (const block of tree.children ?? []) {
      // h2 를 만나면 섹션이 바뀐 것으로 보고 카운터를 비운다
      if (block.type === "heading" && (block.depth ?? 6) <= 2) {
        sectionUsed = new Set();
        continue;
      }
      if (OPAQUE.has(block.type)) continue;
      walk(block);
    }
  };
}
