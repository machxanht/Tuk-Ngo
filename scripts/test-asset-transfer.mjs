import assert from 'node:assert/strict';
import {assetBytes, releaseAssetBytes, clearAssetBytesCache} from '../src/race/asset-transfer.mjs';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const url = 'https://example.test/model.glb';
function fixture(json = '{"asset":{"version":"2.0"}}', bin) {
 const encoded = new TextEncoder().encode(json), jsonLength = Math.ceil(encoded.length / 4) * 4;
 const bytes = new Uint8Array(20 + jsonLength + (bin ? 8 + bin.length : 0));
 const header = new DataView(bytes.buffer);
 header.setUint32(0, 0x46546c67, true); header.setUint32(4, 2, true); header.setUint32(8, bytes.length, true);
 header.setUint32(12, jsonLength, true); header.setUint32(16, 0x4e4f534a, true);
 bytes.fill(32, 20, 20 + jsonLength); bytes.set(encoded, 20);
 if (bin) {header.setUint32(20 + jsonLength, bin.length, true); header.setUint32(24 + jsonLength, 0x004e4942, true); bytes.set(bin, 28 + jsonLength);}
 return bytes;
}
const glb = fixture();
let calls = 0, active = 0, peak = 0;
const fetcher = async () => {
 calls++; active++; peak = Math.max(peak, active);
 await sleep(10); active--; return new Response(glb);
};
const values = await Promise.all(Array.from({length: 12}, (_, i) => assetBytes(i < 4 ? url : `https://example.test/${i}.glb`, {fetcher})));
assert.equal(calls, 9); assert.equal(peak, 3);
new Uint8Array(values[0])[0] = 0;
assert.equal(new Uint8Array(values[1])[0], glb[0]);
await assetBytes(url, {fetcher}); assert.equal(calls, 9);
releaseAssetBytes(url, {fetcher}); await assetBytes(url, {fetcher}); assert.equal(calls, 10);
clearAssetBytesCache({fetcher}); await assetBytes(url, {fetcher}); assert.equal(calls, 11);
let retries = 0, aborted = 0, attempts = 0;
const headersStall = async (_, {signal}) => {
 attempts++; if (attempts === 1) { signal.addEventListener('abort', () => aborted++); return new Promise(() => {}); }
 return new Response(glb);
};
await assetBytes(url, {fetcher: headersStall, stallMs: 25, onRetry: () => retries++});
assert.equal(attempts, 2); assert.equal(retries, 1); assert.equal(aborted, 1);
let cancelled = 0, unlocked = 0, reads = 0;
const readStall = async () => {
 reads++; if (reads > 1) return new Response(glb);
 return {ok: true, body: {getReader: () => ({read: () => new Promise(() => {}), cancel: () => {cancelled++;}, releaseLock: () => {unlocked++;}})}};
};
await assetBytes(url, {fetcher: readStall, stallMs: 25});
assert.equal(reads, 2); assert.equal(cancelled, 1); assert.equal(unlocked, 1);
const slow = async () => new Response(new ReadableStream({async start(controller) {
 for (let i = 0; i < glb.length; i += 3) {await sleep(12); controller.enqueue(glb.slice(i, i + 3));}
 controller.close();
}}));
assert.equal((await assetBytes(url, {fetcher: slow, stallMs: 35})).byteLength, glb.length);
for (const corruption of [new Uint8Array(3), new Uint8Array(12), fixture('{'), fixture('{"asset":{"version":"1.0"}}'), fixture('{"asset":{"version":"2.0"},"buffers":[{"byteLength":8}]}', new Uint8Array(4)), (() => {const b = glb.slice(); new DataView(b.buffer).setUint32(12, glb.length, true); return b;})(), (() => {const b = glb.slice(); new DataView(b.buffer).setUint32(12, 3, true); return b;})(), (() => {const b = glb.slice(); new DataView(b.buffer).setUint32(16, 0x004e4942, true); return b;})(), (() => {const b = glb.slice(); new DataView(b.buffer).setUint32(4, 1, true); return b;})(), (() => {const b = glb.slice(); new DataView(b.buffer).setUint32(8, 99, true); return b;})()]) {
 let count = 0;
 await assetBytes(url, {fetcher: async () => new Response(++count === 1 ? corruption : glb)});
 assert.equal(count, 2);
}
const embedded = fixture('{"asset":{"version":"2.0"},"buffers":[{"byteLength":3}]}', new Uint8Array(4));
assert.equal((await assetBytes(url, {fetcher: async () => new Response(embedded)})).byteLength, embedded.length);
let jsonCalls = 0;
assert.equal(new TextDecoder().decode(await assetBytes('https://example.test/data.json', {fetcher: async () => new Response(++jsonCalls === 1 ? '{' : '{"ok":true}')})), '{"ok":true}');
assert.equal(jsonCalls, 2);
let failures = 0, recover = false;
const failing = async () => {failures++; return recover ? new Response(glb) : new Response('', {status: 503});};
await assert.rejects(assetBytes(url, {attempts: 2, fetcher: failing}), /Unable to load/);
assert.equal(failures, 2); recover = true; await assetBytes(url, {fetcher: failing}); assert.equal(failures, 3);
let permanent = 0;
await assert.rejects(assetBytes(url, {fetcher: async () => {permanent++; return new Response('', {status: 404});}}));
assert.equal(permanent, 1);
let fallback = 0;
await assetBytes(url, {stallMs: 25, fetcher: async () => ++fallback === 1 ? {ok: true, arrayBuffer: () => new Promise(() => {})} : new Response(glb)});
assert.equal(fallback, 2);
let pendingCalls = 0;
const pendingFetcher = async () => {pendingCalls++; await sleep(10); return new Response(glb);};
const pending = assetBytes(url, {fetcher: pendingFetcher});
releaseAssetBytes(url, {fetcher: pendingFetcher});
await Promise.all([pending, assetBytes(url, {fetcher: pendingFetcher})]); assert.equal(pendingCalls, 1);
await assetBytes(url, {fetcher: pendingFetcher}); assert.equal(pendingCalls, 2);
clearAssetBytesCache();
console.log('Asset transfer passed: dedup, max 3, buffer isolation, lifecycle, slow progress, headers/read/fallback stalls, GLB/JSON retries, HTTP retries and eviction.');
