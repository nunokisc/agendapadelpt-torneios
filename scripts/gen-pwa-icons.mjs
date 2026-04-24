import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeB = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data])), 0);
  return Buffer.concat([len, typeB, data, crcB]);
}

function createPNG(size, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  // Draw a rounded-corner paddle icon shape
  const rowLen = 1 + size * 3;
  const raw = Buffer.alloc(rowLen * size);
  const cx = size / 2, cy = size / 2, radius = size * 0.4;
  const cornerR = size * 0.15; // corner rounding for background

  for (let y = 0; y < size; y++) {
    raw[y * rowLen] = 0;
    for (let x = 0; x < size; x++) {
      const off = y * rowLen + 1 + x * 3;
      // Background: emerald #059669
      raw[off] = r; raw[off + 1] = g; raw[off + 2] = b;

      // Draw a white "P" letter in the center
      const nx = (x - cx) / (size * 0.25);
      const ny = (y - cy) / (size * 0.35);

      // Simple P shape: vertical bar + top arc
      const inVertBar = nx >= -0.6 && nx <= -0.2 && ny >= -0.8 && ny <= 0.8;
      const arcCy = -0.3;
      const dx2 = (nx - 0.0) * (nx - 0.0);
      const dy2 = (ny - arcCy) * (ny - arcCy);
      const outerR = 0.55;
      const innerR = 0.2;
      const inArc = dx2 + dy2 <= outerR * outerR && dx2 + dy2 >= innerR * innerR && nx >= -0.3 && ny >= -0.8 && ny <= 0.2;
      const inTopBar = nx >= -0.6 && nx <= 0.2 && ny >= -0.8 && ny <= -0.55;
      const inMidBar = nx >= -0.6 && nx <= 0.2 && ny >= 0.0 && ny <= 0.2;

      if (inVertBar || inArc || inTopBar || inMidBar) {
        raw[off] = 255; raw[off + 1] = 255; raw[off + 2] = 255;
      }
    }
  }

  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

// Emerald-600: #059669 = rgb(5, 150, 105)
for (const size of [192, 512]) {
  const png = createPNG(size, 5, 150, 105);
  writeFileSync(`public/icon-${size}.png`, png);
  console.log(`Created public/icon-${size}.png (${png.length} bytes)`);
}
