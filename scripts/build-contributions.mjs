// build-contributions.mjs
//
// Bakes the GitHub contribution calendar (잔디밭) into a static JSON snapshot
// that the landing-page CommitSkyline reads at build time. Crucially, the
// authenticated owner token returns PRIVATE contribution counts too — so the
// skyline reflects all the invisible work, not just public repos.
//
// Resolution order for credentials:
//   1. `gh api graphql`           (GitHub CLI, if installed + logged in)
//   2. GITHUB_TOKEN / GH_TOKEN    (fetch against the GraphQL API)
//   3. neither  -> keep the existing snapshot, exit 0 (build never breaks)
//
// Run manually (`node scripts/build-contributions.mjs`) to refresh, or as part
// of `build`. Output: src/data/contributions.json

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const LOGIN = process.env.GH_CONTRIB_LOGIN || "0biglife";
const OUT = path.join(process.cwd(), "src/data/contributions.json");

// Trailing 53 weeks ending today, snapped to week boundaries the way GitHub does.
const now = new Date();
const to = now.toISOString();
const fromDate = new Date(now);
fromDate.setUTCDate(fromDate.getUTCDate() - 371); // 53 weeks
const from = fromDate.toISOString();

const QUERY = `query($login:String!,$from:DateTime!,$to:DateTime!){
  user(login:$login){
    name
    contributionsCollection(from:$from,to:$to){
      restrictedContributionsCount
      contributionCalendar{
        totalContributions
        weeks{ contributionDays{ date contributionCount weekday } }
      }
    }
  }
}`;

function viaGh() {
  // execFileSync runs gh directly (no shell), so the multiline query is a
  // single argv element — no quoting/escaping can mangle it.
  try {
    const raw = execFileSync(
      "gh",
      [
        "api",
        "graphql",
        "-f",
        `query=${QUERY}`,
        "-F",
        `login=${LOGIN}`,
        "-F",
        `from=${from}`,
        "-F",
        `to=${to}`,
      ],
      { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] }
    );
    return JSON.parse(raw);
  } catch (err) {
    if (process.env.DEBUG_CONTRIB) console.error("[contributions] gh failed:", err?.message);
    return null;
  }
}

async function viaToken() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: QUERY, variables: { login: LOGIN, from, to } }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function shape(json) {
  const user = json?.data?.user;
  if (!user) return null;
  const cc = user.contributionsCollection;
  const cal = cc.contributionCalendar;

  // weeks -> columns of up to 7 days (the first/last week can be partial).
  // Compact keys to keep the bundle small: d = date, c = count, w = weekday
  // (0=Sun..6=Sat) so the grid rows stay calendar-aligned even when partial.
  const weeks = cal.weeks.map((w) =>
    w.contributionDays.map((day) => ({
      d: day.date,
      c: day.contributionCount,
      w: day.weekday,
    }))
  );

  const counts = weeks.flat().map((x) => x.c);
  const maxCount = counts.reduce((m, c) => Math.max(m, c), 0);
  const activeDays = counts.filter((c) => c > 0).length;

  return {
    login: LOGIN,
    generatedAt: new Date().toISOString(),
    range: { from: from.slice(0, 10), to: to.slice(0, 10) },
    total: cal.totalContributions,
    private: cc.restrictedContributionsCount,
    maxCount,
    activeDays,
    totalDays: counts.length,
    weeks,
  };
}

async function main() {
  const json = viaGh() || (await viaToken());
  if (!json) {
    if (fs.existsSync(OUT)) {
      console.log("[contributions] no gh/token — keeping existing snapshot.");
      return;
    }
    console.error("[contributions] no credentials and no snapshot — writing empty.");
    fs.writeFileSync(OUT, JSON.stringify({ weeks: [], total: 0, private: 0, maxCount: 0 }));
    return;
  }
  const data = shape(json);
  if (!data) {
    console.error("[contributions] unexpected API shape — skipping.");
    return;
  }
  fs.writeFileSync(OUT, JSON.stringify(data));
  console.log(
    `[contributions] ${data.total} total · ${data.private} private · ` +
      `max ${data.maxCount}/day · ${data.activeDays}/${data.totalDays} active days -> ${OUT}`
  );
}

main();
