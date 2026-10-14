import assert from 'node:assert/strict';
import {readFile, readdir, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import ts from 'typescript';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseline = process.env.UM_TUK_ARCHITECTURE_BASELINE && path.resolve(process.env.UM_TUK_ARCHITECTURE_BASELINE);
const relative = file => path.relative(root, file).replaceAll('\\', '/');
const exists = async file => {try {return (await stat(file)).isFile();} catch {return false;}};
async function walk(dir) {
 const files = [];
 for (const item of await readdir(dir, {withFileTypes: true})) {
  const file = path.join(dir, item.name);
  if (item.isDirectory()) files.push(...await walk(file)); else files.push(file);
 }
 return files;
}
const all = [...await walk(path.join(root, 'src')), ...await walk(path.join(root, 'scripts'))];
const sources = all.filter(file => /\.(?:[cm]?js|tsx?|html)$/.test(file));
// Also inspect authored public HTML module imports; bundles are output, not graph roots.
const publicHtml = (await walk(path.join(root, 'public'))).filter(file => file.endsWith('.html'));
const rootHtml = (await readdir(root)).filter(file => file.endsWith('.html')).map(file => path.join(root, file));
const graph = new Map(), incoming = new Map(), failures = [];
function imports(text, file) {
 const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
 const values = [];
 function visit(node) {
  if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) values.push(node.moduleSpecifier.text);
  if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0]) {
   let argument = node.arguments[0];
   // Existing tooling appends a cache-busting query to a literal import path.
   while (ts.isBinaryExpression(argument) && argument.operatorToken.kind === ts.SyntaxKind.PlusToken) argument = argument.left;
   if (ts.isStringLiteralLike(argument)) values.push(argument.text);
  }
  ts.forEachChild(node, visit);
 }
 visit(source); return values;
}
async function resolve(specifier, file) {
 let spec = specifier.split(/[?#]/)[0];
 if (!spec.startsWith('.') && !spec.startsWith('/')) return null;
 // Historical preview HTML is served under the project deployment prefix.
 if (spec.startsWith('/Tuk-Ngo/')) spec = spec.slice('/Tuk-Ngo'.length);
 const base = spec.startsWith('/')
  ? path.join(root, /^\/(src|scripts|node_modules)\//.test(spec) ? spec.slice(1) : 'public/' + spec.slice(1))
  : path.resolve(path.dirname(file), spec);
 const candidates = [base, ...['.ts', '.tsx', '.mjs', '.js', '.json', '.css'].map(ext => base + ext), ...['index.ts', 'index.tsx', 'index.mjs', 'index.js'].map(name => path.join(base, name))];
 for (const candidate of candidates) if (await exists(candidate)) return candidate;
 failures.push(`${relative(file)} -> ${specifier}`); return null;
}
for (const file of [...sources, ...publicHtml, ...rootHtml]) {
 const text = await readFile(file, 'utf8');
 let specs;
 if (file.endsWith('.html')) {
  specs = [];
  for (const match of text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
   if (!/type\s*=\s*['"]module['"]/i.test(match[1])) continue;
   const src = match[1].match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i);
   if (src) specs.push(src[1]); else specs.push(...imports(match[2], file));
  }
 } else specs = imports(text, file);
 const dependencies = [];
 for (const spec of specs) {
  const dependency = await resolve(spec, file);
  if (dependency) {dependencies.push(dependency); incoming.set(dependency, (incoming.get(dependency) || 0) + 1);}
 }
 graph.set(file, [...new Set(dependencies)]);
}
assert.equal(failures.length, 0, 'Broken local imports:\n' + failures.join('\n'));
const raceFiles = all.filter(file => relative(file).startsWith('src/race/') && file.endsWith('.mjs'));
assert.deepEqual(raceFiles.filter(file => /-v\d+(?:[.-]|$)/.test(path.basename(file))).map(relative), [], 'Version-suffixed race modules');
const roots = ['src/main.tsx', 'src/App.tsx', 'src/race/game-engine.mjs', 'src/race/hybrid-boats.mjs'].map(file => path.join(root, file));
const active = new Set();
function visit(file) {if (active.has(file)) return; active.add(file); for (const dependency of graph.get(file) || []) visit(dependency);}
for (const file of roots) {assert(await exists(file), 'Missing root ' + relative(file)); visit(file);}
for (const [file, names] of Object.entries({
 'crowd.mjs': ['crowdVariants', 'crowdIdentity', 'loadCrowdAssets', 'buildCrowd', 'orientBone', 'crowdGesture', 'createCoherentNpcs'],
 'traffic.mjs': ['trafficRoad', 'trafficPose', 'buildTraffic', 'buildCoherentVehicles'],
})) {
 const source = ts.createSourceFile(file, await readFile(path.join(root, 'src/race', file), 'utf8'), ts.ScriptTarget.Latest, true);
 const exports = new Set();
 for (const statement of source.statements) {
  if (!statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) continue;
  if (statement.name) exports.add(statement.name.text);
  if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) if (ts.isIdentifier(declaration.name)) exports.add(declaration.name.text);
 }
 for (const name of names) assert(exports.has(name), `${file} lost API ${name}`);
}
const shirt = await readFile(path.join(root, 'src/race/athlete-shirt.mjs'));
if (baseline) {
 const original = await readFile(path.join(baseline, 'originals/src/race/athlete-shirt-v32.mjs'));
 assert(shirt.equals(original), 'Connected shirt module differs from approved byte-identical baseline');
}
const runtime = JSON.parse(await readFile(path.join(root, 'public/assets/illustrated-v22/shirt-runtime-v32.json'), 'utf8'));
assert.equal(runtime.vertices.length, 533); assert.equal(runtime.indices.length / 3, 896);
assert.deepEqual(runtime.topology, {vertices: 533, triangles: 896, components: 1, boundaryLoops: 4, nonmanifoldEdges: 0});
const edges = new Map();
for (let i = 0; i < runtime.indices.length; i += 3) {
 const triangle = runtime.indices.slice(i, i + 3);
 for (const index of triangle) assert(Number.isInteger(index) && index >= 0 && index < 533, 'Invalid shirt vertex index');
 for (let k = 0; k < 3; k++) {const pair = [triangle[k], triangle[(k + 1) % 3]].sort((a,b) => a-b).join(':'); edges.set(pair, (edges.get(pair) || 0) + 1);}
}
assert([...edges.values()].every(count => count <= 2), 'Nonmanifold shirt edges');
const boundary = new Map();
for (const [edge, count] of edges) if (count === 1) {
 const [a,b] = edge.split(':').map(Number);
 for (const [from,to] of [[a,b],[b,a]]) {if (!boundary.has(from)) boundary.set(from, []); boundary.get(from).push(to);}
}
assert([...boundary.values()].every(neighbors => neighbors.length === 2), 'Boundary is not a set of closed loops');
let loops = 0; const seen = new Set();
for (const start of boundary.keys()) if (!seen.has(start)) {loops++; const queue = [start]; while (queue.length) {const vertex = queue.pop(); if (seen.has(vertex)) continue; seen.add(vertex); queue.push(...boundary.get(vertex));}}
assert.equal(loops, 4, 'Connected shirt must preserve four boundary loops');
const hashes = JSON.parse(await readFile(path.join(root, 'docs/runtime-invariants.json'), 'utf8'));
const required = ['src/race/athlete-shirt.mjs', ...['shirt-runtime-v32.json', 'athlete-rig-v27.glb', 'hull-rig-v25.glb', ...['caller', 'controller', 'helm', 'helm-starboard', 'seated-port', 'seated-starboard', 'standing-port', 'standing-starboard'].map(role => `motion-${role}-v25.glb`)].map(file => 'public/assets/illustrated-v22/' + file)];
assert.deepEqual(Object.keys(hashes).sort(), required.sort(), 'Invariant manifest must cover the exact shirt, runtime data, body/hull and eight motions');
for (const [file, expected] of Object.entries(hashes)) {
 assert.match(expected, /^[a-f0-9]{64}$/, 'Invalid SHA256 for ' + file);
 assert.equal(createHash('sha256').update(await readFile(path.join(root, file))).digest('hex'), expected, 'Preserved source changed: ' + file);
}
console.log('Architecture checks passed: local imports, canonical filenames, crowd/traffic APIs, exact shirt module, measured 533/896/4 topology, twelve preserved source hashes.');
if (process.argv.includes('--graph')) {
 console.log('Active module graph:');
 for (const file of [...active].filter(file => graph.has(file)).sort()) console.log(`${relative(file)} -> ${(graph.get(file) || []).filter(dep => !relative(dep).startsWith('node_modules/')).map(relative).join(', ') || '(external imports only)'}`);
}
console.log('Race modules outside the selected runtime roots:', raceFiles.filter(file => !active.has(file)).map(relative).join(', ') || '(none)');
console.log('Race modules with no incoming authored imports (entry points may be deliberately invoked directly):', raceFiles.filter(file => !incoming.has(file) && !roots.includes(file)).map(relative).join(', ') || '(none)');
