// Raw bytes are cached; consumers receive copies because parsers may mutate buffers.
const caches = new Map();
let active = 0;
const waiting = [];
async function acquire() {
 if (active < 3) { active++; return; }
 await new Promise(resolve => waiting.push(resolve));
}
function releaseSlot() { const next = waiting.shift(); if (next) next(); else active--; }
function keyFor(url) { return new URL(url, globalThis.location?.href || 'http://localhost/').href; }
export function releaseAssetBytes(url, {fetcher = globalThis.fetch} = {}) {
 const cache = caches.get(fetcher), key = keyFor(url), entry = cache?.get(key);
 if (!entry) return;
 if (entry.pending) entry.release = true; else cache.delete(key);
 if (!cache.size) caches.delete(fetcher);
}
export function clearAssetBytesCache({fetcher} = {}) {
 for (const [owner, cache] of caches) {
  if (fetcher && owner !== fetcher) continue;
  for (const [key, entry] of cache) {
   if (entry.pending) entry.release = true; else cache.delete(key);
  }
  if (!cache.size) caches.delete(owner);
 }
}
function validate(url, buffer) {
 const path = new URL(url).pathname.toLowerCase();
 if (path.endsWith('.glb')) {
  if (buffer.byteLength < 20 || buffer.byteLength % 4) throw Error('Truncated or unaligned GLB container');
  const header = new DataView(buffer);
  if (header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2 || header.getUint32(8, true) !== buffer.byteLength) throw Error('Invalid GLB container');
  let offset = 12, json, binLength;
  while (offset < buffer.byteLength) {
   if (offset + 8 > buffer.byteLength) throw Error('Truncated GLB chunk header');
   const length = header.getUint32(offset, true), type = header.getUint32(offset + 4, true);
   const start = offset + 8, end = start + length;
   if (length % 4 || end > buffer.byteLength) throw Error('Invalid GLB chunk length');
   if (offset === 12 && type !== 0x4e4f534a) throw Error('GLB first chunk must be JSON');
   if (type === 0x4e4f534a) {
    if (offset !== 12) throw Error('Duplicate GLB JSON chunk');
    json = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(new Uint8Array(buffer, start, length)));
    if (json?.asset?.version !== '2.0') throw Error('GLB JSON asset version must be 2.0');
   } else if (type === 0x004e4942) {
    if (binLength !== undefined) throw Error('Duplicate GLB BIN chunk');
    binLength = length;
   }
   offset = end;
  }
  const embedded = json.buffers?.[0];
  if (embedded && embedded.uri === undefined) {
   if (!Number.isInteger(embedded.byteLength) || embedded.byteLength < 0 || binLength === undefined || embedded.byteLength > binLength || binLength - embedded.byteLength > 3) throw Error('GLB embedded buffer length exceeds or mismatches BIN chunk');
  }
 } else if (path.endsWith('.json')) JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(buffer));
}
async function transfer(url, {attempts, stallMs, onRetry, fetcher}) {
 let last;
 for (let attempt = 0; attempt < attempts; attempt++) {
  await acquire();
  const controller = new AbortController();
  let timer, reader, response, rejectStall;
  const watchdog = new Promise((_, reject) => { rejectStall = reject; });
  const arm = () => {
   clearTimeout(timer);
   timer = setTimeout(() => {
    const error = Error('Asset transfer stopped progressing');
    rejectStall(error); controller.abort(error);
   }, stallMs);
  };
  const progress = async promise => { const result = await Promise.race([promise, watchdog]); arm(); return result; };
  try {
   const target = new URL(url);
   if (attempt) target.searchParams.set('asset-retry', String(attempt));
   arm();
   response = await progress(fetcher(target.href, {signal: controller.signal, cache: attempt ? 'reload' : 'default'}));
   if (!response.ok) {
    const error = Error('Asset HTTP ' + response.status);
    error.permanent = !(response.status === 408 || response.status === 429 || response.status >= 500);
    throw error;
   }
   let buffer;
   if (!response.body?.getReader) buffer = await progress(response.arrayBuffer());
   else {
    reader = response.body.getReader();
    const chunks = []; let length = 0;
    for (;;) {
     const {done, value} = await Promise.race([reader.read(), watchdog]);
     if (done) break;
     if (value.byteLength) arm();
     chunks.push(value); length += value.byteLength;
    }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    buffer = bytes.buffer;
   }
   validate(url, buffer);
   return buffer;
  } catch (error) {
   last = error; controller.abort(error);
   if (error.permanent) break;
   if (attempt + 1 < attempts) onRetry({url, attempt: attempt + 1, error});
  } finally {
   clearTimeout(timer);
   if (reader) {
    // Never wait indefinitely on a broken transport's cancellation promise.
    if (controller.signal.aborted) {
     try { Promise.resolve(reader.cancel?.()).catch(() => {}); } catch {}
    }
    try { reader.releaseLock?.(); } catch {}
   } else if (controller.signal.aborted && response?.body?.cancel) {
    try { Promise.resolve(response.body.cancel()).catch(() => {}); } catch {}
   }
   releaseSlot();
  }
 }
 throw Error('Unable to load ' + url, {cause: last});
}
export async function assetBytes(url, {attempts = 3, stallMs = 25000, onRetry = () => {}, fetcher = globalThis.fetch} = {}) {
 if (!Number.isInteger(attempts) || attempts < 1 || !Number.isFinite(stallMs) || stallMs <= 0) throw Error('Invalid asset transfer limits');
 const key = keyFor(url);
 let cache = caches.get(fetcher);
 if (!cache) { cache = new Map(); caches.set(fetcher, cache); }
 let entry = cache.get(key);
 if (!entry) {
  entry = {pending: true, release: false}; cache.set(key, entry);
  entry.promise = transfer(key, {attempts, stallMs, onRetry, fetcher}).then(bytes => {
   entry.pending = false;
   if (entry.release) cache.delete(key);
   if (!cache.size) caches.delete(fetcher);
   return bytes;
  }, error => {
   cache.delete(key);
   if (!cache.size) caches.delete(fetcher);
   throw error;
  });
 }
 return (await entry.promise).slice(0);
}
