#!/usr/bin/env node
/**
 * One-time migration: every image in data/blog.json and data/team.json that
 * was hot-linked to https://redthomes.com/wp-content/uploads/... broke the
 * moment DNS cut redthomes.com over to this new site (the old WordPress
 * install is no longer reachable at that hostname). The WordPress server
 * itself is still running at its original IP, just not reachable via DNS
 * anymore — this script downloads every referenced image directly from that
 * IP (bypassing DNS, using the real Host header so the WP server still
 * serves the right content) into assets/images/wp-import/, then rewrites
 * data/blog.json and data/team.json to reference the local copies instead.
 *
 * Run with: node migrate-wp-images.js
 * Then re-run: node build-blog.js && node build-team.js
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = __dirname;
const ORIGIN_IP = "144.202.69.233";
const ORIGIN_HOST = "redthomes.com";
const URL_PREFIX = "https://redthomes.com/wp-content/uploads/";
const LOCAL_PREFIX = "/assets/images/wp-import/";
const CONCURRENCY = 8;

function extractUrls(jsonText) {
  const re = /https:\/\/redthomes\.com\/wp-content\/uploads\/[^\s"'<>)\\]+/g;
  return Array.from(new Set(jsonText.match(re) || []));
}

function downloadOne(url) {
  return new Promise((resolve) => {
    const urlPath = url.slice("https://redthomes.com".length); // /wp-content/uploads/...
    const localRelPath = urlPath.split("?")[0].replace("/wp-content/uploads/", LOCAL_PREFIX);
    const localPath = path.join(ROOT, localRelPath);

    if (fs.existsSync(localPath) && fs.statSync(localPath).size > 0) {
      resolve({ url, localRelPath, status: "cached" });
      return;
    }

    let safePath;
    try {
      safePath = encodeURI(decodeURI(urlPath));
    } catch {
      safePath = encodeURI(urlPath);
    }

    const req = https.request(
      {
        host: ORIGIN_IP,
        port: 443,
        path: safePath,
        method: "GET",
        headers: { Host: ORIGIN_HOST },
        servername: ORIGIN_HOST,
        rejectUnauthorized: false,
        timeout: 20000,
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          resolve({ url, localRelPath, status: "redirect-skipped", code: res.statusCode });
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          resolve({ url, localRelPath, status: "http-error", code: res.statusCode });
          return;
        }
        fs.mkdirSync(path.dirname(localPath), { recursive: true });
        const fileStream = fs.createWriteStream(localPath);
        res.pipe(fileStream);
        fileStream.on("finish", () => {
          fileStream.close();
          resolve({ url, localRelPath, status: "downloaded" });
        });
        fileStream.on("error", (err) => resolve({ url, localRelPath, status: "write-error", error: err.message }));
      }
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ url, localRelPath, status: "timeout" });
    });
    req.on("error", (err) => resolve({ url, localRelPath, status: "req-error", error: err.message }));
    req.end();
  });
}

async function downloadAll(urls) {
  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < urls.length) {
      const i = idx++;
      const r = await downloadOne(urls[i]);
      results.push(r);
      if (results.length % 50 === 0) console.log(`  ${results.length}/${urls.length}...`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return results;
}

function rewriteFile(filePath, urlToLocal) {
  let text = fs.readFileSync(filePath, "utf8");
  let count = 0;
  for (const [url, localRelPath] of urlToLocal) {
    if (text.includes(url)) {
      text = text.split(url).join(localRelPath);
      count++;
    }
  }
  fs.writeFileSync(filePath, text);
  return count;
}

async function main() {
  const blogPath = path.join(ROOT, "data", "blog.json");
  const teamPath = path.join(ROOT, "data", "team.json");
  const blogText = fs.readFileSync(blogPath, "utf8");
  const teamText = fs.readFileSync(teamPath, "utf8");

  const urls = Array.from(new Set([...extractUrls(blogText), ...extractUrls(teamText)]));
  console.log(`Found ${urls.length} unique wp-content image URLs to migrate.`);

  const results = await downloadAll(urls);

  const downloaded = results.filter((r) => r.status === "downloaded" || r.status === "cached");
  const failed = results.filter((r) => r.status !== "downloaded" && r.status !== "cached");

  console.log(`Downloaded/cached: ${downloaded.length}`);
  console.log(`Failed: ${failed.length}`);
  if (failed.length) {
    console.log("Failed URLs (left as-is, will still 404):");
    failed.forEach((f) => console.log(`  [${f.status}${f.code ? " " + f.code : ""}] ${f.url}`));
  }

  const urlToLocal = downloaded.map((r) => [r.url, LOCAL_PREFIX.replace(/\/$/, "") + "/" + r.localRelPath.slice(LOCAL_PREFIX.length)]);
  // Simplify: localRelPath already starts with LOCAL_PREFIX, use it directly.
  const urlToLocalFixed = downloaded.map((r) => [r.url, r.localRelPath]);

  const blogCount = rewriteFile(blogPath, urlToLocalFixed);
  const teamCount = rewriteFile(teamPath, urlToLocalFixed);
  console.log(`Rewrote ${blogCount} URLs in data/blog.json, ${teamCount} in data/team.json.`);
}

main();
