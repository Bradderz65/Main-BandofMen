#!/usr/bin/env node

import fs from "node:fs";
import process from "node:process";
import { execFileSync } from "node:child_process";

const DEFAULT_URL =
  "https://booksy.com/en-gb/122744_band-of-men-barber-salon_barber_1485625_robin-hood";
const DEFAULT_LOCAL_PATH = "index.html";

function parseArgs(argv) {
  const args = {
    url: DEFAULT_URL,
    localPath: DEFAULT_LOCAL_PATH,
    format: "text",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--url") {
      args.url = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === "--local") {
      args.localPath = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === "--format") {
      args.format = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!["text", "json"].includes(args.format)) {
    throw new Error("--format must be one of: text, json");
  }

  return args;
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCategory(value) {
  return value
    .replace(/[’']/g, "'")
    .replace(/\s+services$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeName(value) {
  return value
    .replace(/[’']/g, "'")
    .replace(/\b(or)\b/gi, "/")
    .replace(/\bup\b/gi, "up")
    .replace(/\(([^)]+)\)/g, " $1 ")
    .replace(/[-/]/g, " ")
    .replace(/[+,]/g, " ")
    .replace(/&/g, " and ")
    .replace(/\b65\+\b/g, "65 plus")
    .replace(/\b(\d+)\s*-\s*(\d+)\b/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeDuration(value) {
  return value
    .replace(/\s+/g, "")
    .replace(/mins?/gi, "min")
    .toLowerCase();
}

function normalizePrice(value) {
  return value.replace(/\s+/g, "");
}

function extractBooksyServices(url) {
  const html = execFileSync("curl", ["-L", "--silent", "--fail", url], {
    encoding: "utf8",
  });
  const blocks =
    html.match(
      /<div id="service-\d+"[\s\S]*?<\/button><\/div><\/div>[\s\S]*?<\/div><\/div><\/div>[\s\S]*?<\/div>/g,
    ) || [];
  const byId = new Map();

  for (const block of blocks) {
    const sectionType = extractFirst(/data-ba-cb-section-type="([^"]+)"/, block);
    if (sectionType === "booksy_automatic") {
      continue;
    }

    const service = {
      id: extractFirst(/id="service-(\d+)"/, block),
      category: extractFirst(/data-ba-cb-section-title="([^"]+)"/, block),
      name: extractFirst(/data-testid="service-name"[^>]*>\s*([\s\S]*?)\s*<\/h[34]>/, block),
      price: extractFirst(/data-testid="service-price"[^>]*>\s*([^<]+)\s*<\/div>/, block),
      duration: extractFirst(/data-testid="service-duration"[^>]*>\s*([^<]+)\s*<\/span>/, block),
    };

    if (!byId.has(service.id)) {
      byId.set(service.id, service);
    }
  }

  return [...byId.values()];
}

function extractLocalServices(localPath) {
  const html = fs.readFileSync(localPath, "utf8");
  const menuMatch = html.match(/<h2>Service Menu<\/h2>[\s\S]*?<\/section>/);

  if (!menuMatch) {
    throw new Error(`Could not locate service menu in ${localPath}`);
  }

  const section = menuMatch[0];
  const lines = [];
  let currentCategory = "";
  const tokens = [
    ...section.matchAll(
      /<div class="cat-header">([\s\S]*?)<\/div>|<div class="pricing-row">([\s\S]*?<div class="p-price">[\s\S]*?<\/div>\s*<\/div>)/g,
    ),
  ];

  if (tokens.length === 0) {
    throw new Error(`Could not parse service rows from ${localPath}`);
  }

  for (const token of tokens) {
    if (token[1]) {
      currentCategory = decodeHtml(token[1]);
      continue;
    }

    const block = token[2];
    const name = extractFirst(/<div class="p-name">([\s\S]*?)<\/div>/, block);
    const price = extractFirst(/<div class="p-price">([\s\S]*?)<\/div>/, block);
    const duration = extractFirst(/<span class="p-duration">([\s\S]*?)<\/span>/, block);

    lines.push({
      category: currentCategory,
      name,
      price,
      duration,
    });
  }

  return lines;
}

function extractFirst(pattern, input) {
  const match = input.match(pattern);
  return match ? decodeHtml(match[1]) : "";
}

function buildIndex(services) {
  const index = new Map();

  for (const service of services) {
    const key = `${normalizeCategory(service.category)}::${normalizeName(service.name)}`;
    index.set(key, service);
  }

  return index;
}

function compareServices(localServices, booksyServices) {
  const localIndex = buildIndex(localServices);
  const booksyIndex = buildIndex(booksyServices);
  const missingOnLocal = [];
  const extraOnLocal = [];
  const mismatches = [];

  for (const [key, booksy] of booksyIndex) {
    const local = localIndex.get(key);
    if (!local) {
      missingOnLocal.push(booksy);
      continue;
    }

    const diffs = [];
    if (normalizePrice(local.price) !== normalizePrice(booksy.price)) {
      diffs.push({
        field: "price",
        local: local.price,
        booksy: booksy.price,
      });
    }

    if (normalizeDuration(local.duration) !== normalizeDuration(booksy.duration)) {
      diffs.push({
        field: "duration",
        local: local.duration,
        booksy: booksy.duration,
      });
    }

    if (local.name !== booksy.name || local.category !== booksy.category) {
      diffs.push({
        field: "label",
        local: `${local.category} / ${local.name}`,
        booksy: `${booksy.category} / ${booksy.name}`,
      });
    }

    if (diffs.length > 0) {
      mismatches.push({
        key,
        local,
        booksy,
        diffs,
      });
    }
  }

  for (const [key, local] of localIndex) {
    if (!booksyIndex.has(key)) {
      extraOnLocal.push(local);
    }
  }

  return {
    localCount: localServices.length,
    booksyCount: booksyServices.length,
    missingOnLocal,
    extraOnLocal,
    mismatches,
  };
}

function renderText(report) {
  const substantiveMismatches = report.mismatches.filter((item) =>
    item.diffs.some((diff) => diff.field === "price" || diff.field === "duration"),
  );
  const labelOnlyMismatches = report.mismatches.filter(
    (item) => !item.diffs.some((diff) => diff.field === "price" || diff.field === "duration"),
  );
  const lines = [];
  lines.push(`Local services: ${report.localCount}`);
  lines.push(`Booksy services: ${report.booksyCount}`);
  lines.push(`Missing on local: ${report.missingOnLocal.length}`);
  lines.push(`Extra on local: ${report.extraOnLocal.length}`);
  lines.push(`Substantive mismatches: ${substantiveMismatches.length}`);
  lines.push(`Label-only differences: ${labelOnlyMismatches.length}`);
  lines.push("");

  if (report.missingOnLocal.length > 0) {
    lines.push("Missing on local");
    for (const item of report.missingOnLocal) {
      lines.push(`- ${item.category} | ${item.name} | ${item.price} | ${item.duration}`);
    }
    lines.push("");
  }

  if (report.extraOnLocal.length > 0) {
    lines.push("Extra on local");
    for (const item of report.extraOnLocal) {
      lines.push(`- ${item.category} | ${item.name} | ${item.price} | ${item.duration}`);
    }
    lines.push("");
  }

  if (substantiveMismatches.length > 0) {
    lines.push("Substantive mismatches");
    for (const item of substantiveMismatches) {
      lines.push(`- ${item.booksy.name}`);
      for (const diff of item.diffs) {
        lines.push(`  ${diff.field}: local="${diff.local}" | booksy="${diff.booksy}"`);
      }
    }
    lines.push("");
  }

  if (labelOnlyMismatches.length > 0) {
    lines.push("Label-only differences");
    for (const item of labelOnlyMismatches) {
      const diff = item.diffs.find((entry) => entry.field === "label");
      lines.push(`- ${item.booksy.name}`);
      lines.push(`  local="${diff.local}" | booksy="${diff.booksy}"`);
    }
    lines.push("");
  }

  if (
    report.missingOnLocal.length === 0 &&
    report.extraOnLocal.length === 0 &&
    report.mismatches.length === 0
  ) {
    lines.push("No differences found.");
  }

  return `${lines.join("\n").trim()}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    process.stdout.write(
      [
        "Usage: node scripts/compare-booksy-services.mjs [--local <path>] [--url <booksy-url>] [--format text|json]",
        "",
        "Examples:",
        "  node scripts/compare-booksy-services.mjs",
        "  node scripts/compare-booksy-services.mjs --format json",
      ].join("\n"),
    );
    process.stdout.write("\n");
    return;
  }

  const localServices = extractLocalServices(args.localPath);
  const booksyServices = extractBooksyServices(args.url);
  const report = {
    url: args.url,
    localPath: args.localPath,
    checkedAt: new Date().toISOString(),
    ...compareServices(localServices, booksyServices),
  };

  if (args.format === "json") {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  process.stdout.write(renderText(report));
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
