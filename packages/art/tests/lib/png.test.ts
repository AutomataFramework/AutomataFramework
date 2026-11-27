import { expect, test } from 'bun:test'
import { inflateSync } from 'node:zlib'
import { crc32, encodePng } from '../../src/lib/png.ts'

test('crc32 matches the known check value', () => {
  expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
})

test('the PNG has its signature, a true header, good checksums, and gives back the pixels', () => {
  const rgba = Uint8Array.from({ length: 3 * 2 * 4 }, (_, i) => (i * 37) % 256)
  const png = encodePng(3, 2, rgba)
  expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
  const view = new DataView(png.buffer, png.byteOffset)
  const chunks: Record<string, Uint8Array> = {}
  for (let at = 8; at < png.length;) {
    const length = view.getUint32(at)
    const type = new TextDecoder().decode(png.subarray(at + 4, at + 8))
    expect(view.getUint32(at + 8 + length)).toBe(crc32(png.subarray(at + 4, at + 8 + length)))
    chunks[type] = png.subarray(at + 8, at + 8 + length)
    at += 12 + length
  }
  expect(Object.keys(chunks)).toEqual(['IHDR', 'IDAT', 'IEND'])
  expect([...(chunks['IHDR'] ?? [])]).toEqual([0, 0, 0, 3, 0, 0, 0, 2, 8, 6, 0, 0, 0])
  const rows = inflateSync(chunks['IDAT'] ?? new Uint8Array())
  expect(rows[0]).toBe(0)
  expect([...rows.subarray(1, 13), ...rows.subarray(14, 26)]).toEqual([...rgba])
})
