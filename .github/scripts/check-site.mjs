// CI check: stops a deploy if index.html points at something that doesn't exist.
import { existsSync, readFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const problems = [];

const refs = new Set();
for (const [, ref] of html.matchAll(/\b(?:src|href|data-link)="([^"]+)"/g)) refs.add(ref);
for (const [, list] of html.matchAll(/\bdata-images="([^"]+)"/g)) list.split('|').forEach(ref => refs.add(ref));
for (const [, ref] of html.matchAll(/property="og:image" content="([^"]+)"/g)) refs.add(ref);

const localRefs = [...refs].filter(ref => !/^(https?:|mailto:|tel:|data:|#)/.test(ref));
for (const ref of localRefs) {
  if (!existsSync(ref.split(/[?#]/)[0])) problems.push(`Missing file: ${ref}`);
}

// Reel items open a project card by id; a typo only shows up when a visitor clicks.
const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
for (const [, id] of html.matchAll(/\bdata-open="([^"]+)"/g)) {
  if (!ids.has(id)) problems.push(`Reel item opens a card that doesn't exist: #${id}`);
}
for (const [, target] of html.matchAll(/\bhref="#([^"]+)"/g)) {
  if (!ids.has(target)) problems.push(`Link points at a missing section: #${target}`);
}

const cards = (html.match(/<article class="pcard"/g) || []).length;
const shown = Number((html.match(/id="indexCount">(\d+)</) || [])[1]);
if (cards !== shown) problems.push(`Project counter says ${shown}, but there are ${cards} project cards.`);

if (problems.length) {
  problems.forEach(problem => console.error(`::error::${problem}`));
  process.exit(1);
}
console.log(`OK: ${localRefs.length} local files and ${cards} project cards checked.`);
