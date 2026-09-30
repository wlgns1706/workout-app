import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function icon(size) {
  const bg = [37, 99, 235];
  const fg = [255, 255, 255];
  const raw = Buffer.alloc(size * (1 + size * 3));
  const inRect = (x, y, x0, y0, x1, y1) => x >= x0 * size && x < x1 * size && y >= y0 * size && y < y1 * size;
  for (let y = 0; y < size; y++) {
    const row = y * (1 + size * 3);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      const white =
        inRect(x, y, 0.3, 0.46, 0.7, 0.54) || // 봉
        inRect(x, y, 0.22, 0.32, 0.32, 0.68) || // 왼쪽 원판
        inRect(x, y, 0.68, 0.32, 0.78, 0.68); // 오른쪽 원판
      const [r, g, b] = white ? fg : bg;
      raw[row + 1 + x * 3] = r;
      raw[row + 2 + x * 3] = g;
      raw[row + 3 + x * 3] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // 비트 깊이
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  writeFileSync(`public/icon-${size}.png`, icon(size));
  console.log(`public/icon-${size}.png`);
}
