import assert from 'node:assert/strict'
import { patchExpoSqliteWorkerChannelSource } from './patch-expo-sqlite-web.mjs'

const buggy = `
const resultArray = new Uint8Array(resultBuffer);
const length = resultBytes.length;
resultArray.set(new Uint32Array([length]), 0);
resultArray.set(resultBytes, 4);

let i = 0;
const useAtomicsPause = typeof Atomics.pause === 'function';
while (Atomics.load(lock, 0) === PENDING) {
  ++i;
  if (useAtomicsPause) {
      if (i > 1_000_000) {
        throw new Error('Sync operation timeout');
      }
      Atomics.pause();
  }
}

const length = new Uint32Array(resultArray.buffer, 0, 1)[0];
`

const patched = patchExpoSqliteWorkerChannelSource(buggy)
assert.equal(patched.changed, true)
assert.match(patched.source, /new DataView\(resultBuffer\)\.setUint32\(0, length, true\)/)
assert.match(patched.source, /new DataView\(resultBuffer\)\.getUint32\(0, true\)/)
assert.match(patched.source, /const deadline = Date\.now\(\) \+ 15_000/)
assert.match(patched.source, /Date\.now\(\) > deadline/)
assert.doesNotMatch(patched.source, /resultArray\.set\(new Uint32Array\(\[length\]\), 0\)/)
assert.doesNotMatch(patched.source, /if \(i > 1_000_000\)/)

const alreadyPatched = patchExpoSqliteWorkerChannelSource(patched.source)
assert.equal(alreadyPatched.changed, false)
assert.equal(alreadyPatched.source, patched.source)

console.log('expo-sqlite Web compatibility patch regression passed')
