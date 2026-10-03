import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const matter = require('gray-matter');
const root = new URL('../content/posts/', import.meta.url);
const posts = readdirSync(root).map(slug => {
  const { data, content } = matter(readFileSync(new URL(`${slug}/index.mdx`, root), 'utf8'));
  return { ...data, slug, content };
});
const av = posts.filter(p => p.category === '자율주행');
const registry = new URL('../src/lib/series.ts', import.meta.url);
const seriesModule = existsSync(registry) ? await import(registry.href) : null;

test('every AV chapter belongs to one of six series with a unique contiguous reading order', () => {
  assert.ok(seriesModule, 'series registry must exist');
  const { SERIES, getSeriesPosts } = seriesModule;
  assert.equal(SERIES.length, 6);
  assert.equal(av.length, 26, '25 existing posts and one Data Flywheel overview');
  assert.equal(new Set(av.map(p => p.slug)).size, av.length);
  for (const post of av) {
    assert.ok(SERIES.some(s => s.slug === post.series), `unassigned: ${post.slug}`);
    assert.ok(Number.isInteger(post.seriesOrder) && post.seriesOrder > 0, post.slug);
  }
  for (const series of SERIES) {
    const chapters = getSeriesPosts(av, series.slug);
    assert.ok(chapters.length > 0);
    assert.deepEqual(chapters.map(p => p.seriesOrder), chapters.map((_, i) => i + 1));
  }
});

test('navigation follows learning order, handles endpoints and does not change its input', () => {
  assert.ok(seriesModule);
  const { getPostSeries } = seriesModule;
  const before = posts.map(p => p.slug);
  const editor = getPostSeries(posts, 'av-annotation-tool');
  assert.equal(editor.previous.slug, 'av-annotation-data');
  assert.equal(editor.next.slug, 'av-annotation-backend');
  assert.equal(getPostSeries(posts, 'av-label-loop').next, undefined);
  assert.equal(getPostSeries(posts, 'av-scene-data').previous, undefined);
  assert.equal(getPostSeries(posts, 'not-a-post'), undefined);
  assert.equal(getPostSeries(posts, 'begin-blog'), undefined);
  assert.deepEqual(posts.map(p => p.slug), before);
});

test('all AV posts contain primary references and resolve their internal post links', () => {
  const slugs = new Set(posts.map(p => p.slug));
  for (const post of av) {
    assert.match(post.content, /^## 참고 자료/m, `${post.slug}: references missing`);
    assert.match(post.content, /\]\(https:\/\//, `${post.slug}: external reference missing`);
    for (const [, slug] of post.content.matchAll(/\]\(\/posts\/([^#)\s]+)(?:#[^)]*)?\)/g)) {
      assert.ok(slugs.has(slug), `${post.slug} links to missing ${slug}`);
    }
  }
});

test('published article addresses remain available after reorganization', () => {
  const expected = ['scene-data','calibration','3d-data','lane-detection','3d-object-detection','occupancy','trajectory','visualization','3d-geometry','data-formats','simulation','foundation-models','data-platform','camera-image','perception-tasks','annotation-data','mcap','webgl','localization','planning-control','sensors','annotation-backend','annotation-tool','label-loop','deskew'];
  for (const slug of expected) assert.ok(posts.some(p => p.slug === `av-${slug}`), slug);
});
