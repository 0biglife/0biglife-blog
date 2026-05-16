import test from "node:test";
import assert from "node:assert/strict";
import { langForExt, walkFiles } from "./build-works.mjs";

test("langForExt maps extensions to highlighter languages", () => {
  assert.equal(langForExt(".html"), "html");
  assert.equal(langForExt(".css"), "css");
  assert.equal(langForExt(".js"), "javascript");
  assert.equal(langForExt(".unknown"), "text");
});

test("walkFiles returns relative paths for nested files", () => {
  const files = walkFiles(new URL("./__fixtures__/demo", import.meta.url).pathname);
  const paths = [...files].sort();
  assert.deepEqual(paths, ["index.html", "js/app.js"]);
});
