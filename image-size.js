/**
 * redT Homes — tiny image dimension reader (zero dependencies, Node's fs/path only)
 *
 * Reads width/height straight from JPEG, PNG, GIF and WebP file headers so the
 * build scripts can add width/height attributes to <img> tags. Browsers use
 * those to reserve space while images load, which prevents layout shift (CLS).
 *
 * Usage: const { imageSize, addImageDimensions } = require("./image-size");
 */

const fs = require("fs");
const path = require("path");

const cache = new Map();

function readSize(buf) {
  // PNG: width/height are big-endian at bytes 16 and 20 of the IHDR chunk
  if (buf.length >= 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  // GIF: little-endian at bytes 6 and 8
  if (buf.length >= 10 && buf.toString("ascii", 0, 3) === "GIF") {
    return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  }
  // WebP: RIFF container with a VP8 / VP8L / VP8X chunk
  if (buf.length >= 30 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    const chunk = buf.toString("ascii", 12, 16);
    if (chunk === "VP8 ") return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    if (chunk === "VP8L") {
      const b = buf.readUInt32LE(21);
      return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
    }
    if (chunk === "VP8X") return { width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 };
  }
  // JPEG: walk the markers until a start-of-frame (SOF0–SOF15, excluding DHT/JPG/DAC)
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
      }
      i += 2 + len;
    }
  }
  return null;
}

/** Returns { width, height } for a site-relative path like "/assets/images/x.jpg", or null. */
function imageSize(src, root) {
  if (!src || !src.startsWith("/") || src.startsWith("//")) return null;
  const rel = decodeURIComponent(src.split(/[?#]/)[0]);
  if (cache.has(rel)) return cache.get(rel);
  let size = null;
  try {
    const file = path.join(root, rel);
    const fd = fs.openSync(file, "r");
    const buf = Buffer.alloc(Math.min(fs.fstatSync(fd).size, 512 * 1024));
    fs.readSync(fd, buf, 0, buf.length, 0);
    fs.closeSync(fd);
    size = readSize(buf);
    if (size && (!size.width || !size.height)) size = null;
  } catch (e) {
    size = null;
  }
  cache.set(rel, size);
  return size;
}

/** Adds width/height to every <img> in an HTML string that has a local src and no width/height yet. */
function addImageDimensions(html, root) {
  return html.replace(/<img\b([^>]*)>/gi, (match, attrs) => {
    if (/\bwidth\s*=/.test(attrs) || /\bheight\s*=/.test(attrs)) return match;
    const src = (attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i) || [])[1];
    const size = imageSize(src, root);
    if (!size) return match;
    const selfClosing = /\/\s*$/.test(attrs);
    const base = attrs.replace(/\s*\/\s*$/, "");
    return `<img${base} width="${size.width}" height="${size.height}"${selfClosing ? " /" : ""}>`;
  });
}

module.exports = { imageSize, addImageDimensions };
