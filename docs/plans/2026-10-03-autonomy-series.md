# Autonomous-driving series and editorial review

> **For Codex:** Execute the approved plan in this task; the user has authorized implementation and production deployment.

**Goal:** Turn the existing 25 autonomous-driving posts into six navigable learning series, correct the reviewed technical errors, add primary references, and publish a Data Flywheel overview with dated industry analysis.

**Architecture:** Keep existing post URLs and the parent category. Store a series ID and reading order in each post's frontmatter; a small typed registry owns series titles and descriptions. The log index, series pages, and post navigation use the same metadata. Keep the established light/dark and lime-accent design.

**Tech Stack:** Next.js 15 App Router, React 19, Chakra UI, MDX, TypeScript, CSS modules; main deploys through AWS Amplify.

## Approved design

- Six series: sensors/coordinates (7), perception/prediction (6), driving models/validation (3), data platform (3 existing + overview), annotation/quality (4), visualization (2).
- `/series` provides a reading guide and six series; `/series/[slug]` has purpose, audience, prerequisites, and ordered chapters.
- Keep the homepage as a full-screen topology only. Show blog articles and series exclusively within LOG, with six discovery entries on `/log`.
- Each post displays its series and position, an expandable ordered chapter list, and previous/next chapters at the bottom.
- Preserve all existing `/posts/*` URLs, publish dates, and unrelated local changes. Mark substantively reviewed articles with an updated date.
- Use primary sources, explicitly distinguish announcements from results and analysis, and avoid unsupported company-wide claims.

## Execution checklist

1. Establish clean baseline type/lint checks in an isolated worktree. The original checkout has unrelated uncommitted work; do not include it wholesale.
2. Add regression checks for series completeness, unique chapter order, correct annotation order, existing URL continuity, internal links, and primary references. Verify the new checks fail before implementation.
3. Implement the registry, frontmatter parsing, series pages, shared cards and post navigation. Keep all article discovery out of the topology homepage. Check unknown routes and optional-series posts.
4. Correct scene/sample terminology, MCAP ordering, capture-time pose interpolation, overgeneralized simulation and evaluation claims. Add relevant sources to all 25 existing AV posts.
5. Refine the existing uncommitted Data Flywheel draft into a sourced overview covering operational architecture, KPIs, Portal/Pipeline concerns, leakage, and dated public industry evidence. Preserve the original draft in the original checkout.
6. Run content checks, lint, type check, and the production build. Inspect desktop/mobile, light/dark, keyboard navigation, glossary, and key page links through the browser.
7. Review the complete diff, address findings, commit only scoped changes, and push the reviewed commit to main without force. Confirm Amplify deployment and production content at clean URLs.

## Validation and handoff

- No framework upgrades, private company information, new paid services, or unrelated articles.
- Existing node_modules is reused; build outputs and credentials are not committed.
- Retain production commit and Amplify job evidence in the final response. The original dirty checkout remains untouched if bringing it forward would overwrite user work.
