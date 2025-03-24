export function extractHeadings(content: string) {
  if (typeof document === "undefined") return [];

  const tempElement = document.createElement("div");
  tempElement.innerHTML = content;

  const headings = Array.from(tempElement.querySelectorAll("h2, h3")).map(
    (heading) => ({
      id: heading.id,
      text: heading.textContent || "",
      level: heading.tagName === "H2" ? 2 : 3,
    })
  );

  return headings;
}

export const slugify = (text: string): string => {
  const raw = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");

  return raw || "section";
};

export function errorLog(message: string, error?: unknown) {
  console.error("🚨 [ERROR]:", message);
  if (error) console.error(error);
}
