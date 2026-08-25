#!/usr/bin/env node
/**
 * redT Homes — listing spreadsheet sync check (zero dependencies)
 *
 * Compares listings/property_listings.xlsx (the spreadsheet Jennifer keeps
 * up to date) against data/listings.json (what the site actually shows) and
 * reports differences: new rows not yet on the site, rows whose price/status/
 * address/etc. changed, and site listings that have disappeared from the
 * spreadsheet (likely sold/pulled).
 *
 * This does NOT touch data/listings.json — it only reports. Updating a
 * listing (new photos, description, community, HubSpot form ID) is still a
 * manual step, since those require real content decisions.
 *
 * Includes a minimal, dependency-free .xlsx reader (xlsx is just a zip of
 * XML files) since this project avoids npm dependencies everywhere else.
 * Only plain cell values are handled — no formulas, merged cells, or rich
 * text runs beyond simple concatenation, which is all this spreadsheet uses.
 *
 * Run with: node check-listings-spreadsheet.js
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = __dirname;

// ---------------------------------------------------------------------------
// Minimal .xlsx (zip + XML) reader
// ---------------------------------------------------------------------------

function readZipEntries(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd === -1) throw new Error("Not a valid .xlsx (no zip end-of-central-directory record)");
  const cdOffset = buf.readUInt32LE(eocd + 16);
  const cdEntries = buf.readUInt16LE(eocd + 10);
  const entries = {};
  let ptr = cdOffset;
  for (let i = 0; i < cdEntries; i++) {
    const method = buf.readUInt16LE(ptr + 10);
    const compSize = buf.readUInt32LE(ptr + 20);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localHeaderOffset = buf.readUInt32LE(ptr + 42);
    const name = buf.toString("utf8", ptr + 46, ptr + 46 + nameLen);
    entries[name] = { method, compSize, localHeaderOffset };
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function extractEntry(buf, entry) {
  const lh = entry.localHeaderOffset;
  const nameLen = buf.readUInt16LE(lh + 26);
  const extraLen = buf.readUInt16LE(lh + 28);
  const dataStart = lh + 30 + nameLen + extraLen;
  const raw = buf.subarray(dataStart, dataStart + entry.compSize);
  if (entry.method === 0) return raw;
  if (entry.method === 8) return zlib.inflateRawSync(raw);
  throw new Error("Unsupported zip compression method " + entry.method);
}

function decodeXmlEntities(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function parseSharedStrings(xml) {
  const strings = [];
  const siRe = /<si>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = siRe.exec(xml))) {
    const tRe = /<t[^>]*>([\s\S]*?)<\/t>/g;
    let text = "";
    let tm;
    while ((tm = tRe.exec(m[1]))) text += tm[1];
    strings.push(decodeXmlEntities(text));
  }
  return strings;
}

function colToIndex(col) {
  let idx = 0;
  for (let i = 0; i < col.length; i++) idx = idx * 26 + (col.charCodeAt(i) - 64);
  return idx - 1;
}

function parseSheetRows(xml, sharedStrings) {
  const rows = [];
  const rowRe = /<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  let rm;
  while ((rm = rowRe.exec(xml))) {
    const rowNum = Number(rm[1]);
    const rowXml = rm[2];
    const cellRe = /<c r="([A-Z]+)(\d+)"([^>]*)>(?:([\s\S]*?))?<\/c>|<c r="([A-Z]+)(\d+)"([^>]*)\/>/g;
    const rowArr = [];
    let cm;
    while ((cm = cellRe.exec(rowXml))) {
      const col = cm[1] || cm[5];
      const attrs = cm[3] || cm[6] || "";
      const inner = cm[4] || "";
      const typeMatch = attrs.match(/t="([^"]+)"/);
      const type = typeMatch ? typeMatch[1] : null;
      const idx = colToIndex(col);
      let value = null;
      if (type === "s") {
        const vMatch = inner.match(/<v>([\s\S]*?)<\/v>/);
        value = vMatch ? sharedStrings[Number(vMatch[1])] : "";
      } else if (type === "inlineStr") {
        const tMatch = inner.match(/<t[^>]*>([\s\S]*?)<\/t>/);
        value = tMatch ? decodeXmlEntities(tMatch[1]) : "";
      } else {
        const vMatch = inner.match(/<v>([\s\S]*?)<\/v>/);
        value = vMatch ? vMatch[1] : null;
        if (value !== null && value !== "" && !isNaN(Number(value))) value = Number(value);
      }
      rowArr[idx] = value;
    }
    rows[rowNum] = rowArr;
  }
  return rows;
}

function readFirstSheetAsObjects(xlsxPath) {
  const buf = fs.readFileSync(xlsxPath);
  const entries = readZipEntries(buf);
  const sharedStrings = entries["xl/sharedStrings.xml"]
    ? parseSharedStrings(extractEntry(buf, entries["xl/sharedStrings.xml"]).toString("utf8"))
    : [];
  const sheetXml = extractEntry(buf, entries["xl/worksheets/sheet1.xml"]).toString("utf8");
  const rows = parseSheetRows(sheetXml, sharedStrings);

  const header = rows[1] || [];
  const records = [];
  for (let r = 2; r < rows.length; r++) {
    if (!rows[r]) continue;
    const rec = {};
    header.forEach((colName, i) => {
      if (colName) rec[colName] = rows[r][i] !== undefined ? rows[r][i] : null;
    });
    records.push(rec);
  }
  return records;
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

function normStr(v) {
  return String(v == null ? "" : v).trim();
}

// Loose match for fields prone to harmless formatting noise (comma-separated
// numbers, "#2" vs "# 2" spacing, stray whitespace) without hiding real
// content changes.
function normLoose(v) {
  return String(v == null ? "" : v).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function main() {
  const xlsxPath = path.join(ROOT, "listings", "property_listings.xlsx");
  const jsonPath = path.join(ROOT, "data", "listings.json");

  const sheetRows = readFirstSheetAsObjects(xlsxPath);
  const siteListings = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

  const sheetByMls = new Map();
  sheetRows.forEach((row) => {
    const mlsId = normStr(row["MLS ID"]);
    if (mlsId) sheetByMls.set(mlsId, row);
  });

  const siteByMls = new Map();
  siteListings.forEach((l) => {
    siteByMls.set(normStr(l.mlsId), l);
  });

  const newInSheet = [];
  const changed = [];
  const missingFromSheet = [];

  const FIELD_MAP = [
    ["Price", "price", (v) => Number(v)],
    ["Status", "status", normStr],
    ["Property name / address", "address", normLoose],
    ["Beds", "beds", normStr],
    ["Baths", "baths", normStr],
    ["Sqft", "sqft", normLoose],
    ["County/Community", "community", normStr],
  ];

  for (const [mlsId, row] of sheetByMls) {
    const listing = siteByMls.get(mlsId);
    if (!listing) {
      newInSheet.push(row);
      continue;
    }
    const diffs = [];
    for (const [sheetKey, jsonKey, normalize] of FIELD_MAP) {
      const sheetNorm = normalize(row[sheetKey]);
      const jsonNorm = normalize(listing[jsonKey]);
      if (String(sheetNorm) !== String(jsonNorm)) {
        diffs.push(`${jsonKey}: "${normStr(listing[jsonKey])}" -> "${normStr(row[sheetKey])}"`);
      }
    }
    if (diffs.length) changed.push({ mlsId, address: row["Property name / address"], diffs });
  }

  for (const [mlsId, listing] of siteByMls) {
    if (!sheetByMls.has(mlsId)) missingFromSheet.push(listing);
  }

  const lines = [];
  lines.push(`# Listing spreadsheet check - ${new Date().toISOString()}`);
  lines.push("");
  lines.push(`Spreadsheet rows: ${sheetRows.length} | Site listings: ${siteListings.length}`);
  lines.push("");

  lines.push(`## New in spreadsheet, not yet on site (${newInSheet.length})`);
  if (newInSheet.length === 0) lines.push("None.");
  newInSheet.forEach((row) => {
    lines.push(`- MLS ${row["MLS ID"]} - ${row["Property name / address"]} (${row["City"]}) - $${row["Price"]} - ${row["Status"]}`);
  });
  lines.push("");

  lines.push(`## Changed fields (${changed.length})`);
  if (changed.length === 0) lines.push("None.");
  changed.forEach((c) => {
    lines.push(`- MLS ${c.mlsId} - ${c.address}`);
    c.diffs.forEach((d) => lines.push(`    - ${d}`));
  });
  lines.push("");

  lines.push(`## On site but missing from spreadsheet, likely sold/pulled (${missingFromSheet.length})`);
  if (missingFromSheet.length === 0) lines.push("None.");
  missingFromSheet.forEach((l) => {
    lines.push(`- MLS ${l.mlsId} - ${l.address} (${l.city})`);
  });
  lines.push("");

  const report = lines.join("\n") + "\n";
  fs.writeFileSync(path.join(ROOT, "listings-check-report.md"), report);
  console.log(report);

  const hasChanges = newInSheet.length || changed.length || missingFromSheet.length;
  console.log(hasChanges ? "Changes detected - see listings-check-report.md" : "No changes detected.");
}

main();
