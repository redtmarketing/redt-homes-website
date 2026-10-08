#!/usr/bin/env node
/**
 * redT Homes — mortgage rate sync (zero dependencies, Node's fs/https only)
 *
 * Pulls the latest weekly 30-year fixed mortgage rate average from the St.
 * Louis Fed's FRED API (series MORTGAGE30US, Freddie Mac's Primary Mortgage
 * Market Survey — published every Thursday) and writes it to
 * data/mortgage-rate.json. build-listings.js reads that file and uses the
 * value as the mortgage calculator's default starting rate on every listing
 * page.
 *
 * Requires a free FRED API key: https://fred.stlouisfed.org/docs/api/api_key.html
 * Reads it from the FRED_API_KEY environment variable, or from a local
 * .env file (FRED_API_KEY=...) — never commit that file or hardcode the key.
 *
 * Run with: node update-mortgage-rate.js
 * Then re-run: node build-listings.js
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = __dirname;

function loadEnvKey() {
  if (process.env.FRED_API_KEY) return process.env.FRED_API_KEY;
  const envPath = path.join(ROOT, ".env");
  if (fs.existsSync(envPath)) {
    const line = fs.readFileSync(envPath, "utf8")
      .split("\n")
      .find((l) => l.trim().startsWith("FRED_API_KEY="));
    if (line) return line.split("=").slice(1).join("=").trim();
  }
  return null;
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`FRED API returned HTTP ${res.statusCode}`));
        res.resume();
        return;
      }
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(err);
        }
      });
    })
      .on("error", reject)
      // Without a timeout the scheduled run can hang forever if the network
      // isn't up yet (e.g. right after the PC wakes), until Windows kills it.
      .setTimeout(30000, function () {
        this.destroy(new Error("FRED API request timed out after 30s"));
      });
  });
}

// Retry a few times so a slow network at wake-up doesn't skip the week.
async function fetchWithRetry(url, attempts = 5, delayMs = 60000) {
  for (let i = 1; ; i++) {
    try {
      return await fetchJSON(url);
    } catch (err) {
      if (i >= attempts) throw err;
      console.error(`Attempt ${i} failed (${err.message}); retrying in ${delayMs / 1000}s...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

async function main() {
  const apiKey = loadEnvKey();
  if (!apiKey) {
    console.error("Missing FRED_API_KEY. Set it as an environment variable or in a local .env file (FRED_API_KEY=...).");
    process.exit(1);
  }

  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=MORTGAGE30US&api_key=${apiKey}&file_type=json&sort_order=desc&limit=5`;
  const data = await fetchWithRetry(url);

  const latest = (data.observations || []).find((o) => o.value !== ".");
  if (!latest) {
    console.error("No usable observation returned by FRED.");
    process.exit(1);
  }

  const out = {
    rate: Number(latest.value),
    asOf: latest.date,
    source: "FRED series MORTGAGE30US (Freddie Mac PMMS, 30-yr fixed average)",
    fetchedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(ROOT, "data", "mortgage-rate.json"),
    JSON.stringify(out, null, 2) + "\n"
  );

  console.log(`Updated data/mortgage-rate.json - ${out.rate}% as of ${out.asOf}.`);
}

main().catch((err) => {
  console.error("Failed to update mortgage rate:", err.message);
  process.exit(1);
});
