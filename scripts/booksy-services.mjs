#!/usr/bin/env node

import process from "node:process";
import { execFileSync } from "node:child_process";

const DEFAULT_URL =
  "https://booksy.com/en-gb/122744_band-of-men-barber-salon_barber_1485625_robin-hood";

function parseArgs(argv) {
  const args = {
    url: DEFAULT_URL,
    format: "json",
    includePopular: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--url") {
      args.url = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === "--format") {
      args.format = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === "--include-popular") {
      args.includePopular = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!args.url) {
    throw new Error("Missing value for --url");
  }

  if (!["json", "text"].includes(args.format)) {
    throw new Error("--format must be one of: json, text");
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

function extractFirst(pattern, input) {
  const match = input.match(pattern);
  return match ? decodeHtml(match[1]) : "";
}

function extractServicesLegacy(html, options = {}) {
  const services = [];
  const blocks = html.match(
    /<div id="service-\d+"[\s\S]*?<\/button><\/div><\/div>[\s\S]*?<\/div><\/div><\/div>[\s\S]*?<\/div>/g,
  );

  if (!blocks) {
    return services;
  }

  for (const block of blocks) {
    const idMatch = block.match(/id="service-(\d+)"/);
    const category = extractFirst(/data-ba-cb-section-title="([^"]+)"/, block);
    const sectionType = extractFirst(/data-ba-cb-section-type="([^"]+)"/, block);

    if (!options.includePopular && sectionType === "booksy_automatic") {
      continue;
    }

    services.push({
      id: idMatch ? idMatch[1] : "",
      category,
      sectionType,
      name: extractFirst(/data-testid="service-name"[^>]*>\s*([\s\S]*?)\s*<\/h[34]>/, block),
      price: extractFirst(/data-testid="service-price"[^>]*>\s*([^<]+)\s*<\/div>/, block),
      duration: extractFirst(/data-testid="service-duration"[^>]*>\s*([^<]+)\s*<\/span>/, block),
    });
  }

  return services;
}

// Booksy redesigned the services list (2026): service cards use
// data-testid="service" / service-name / service-variant-price|duration,
// with categories as nearby h2/h3 headings.
function extractServicesCurrent(html, options = {}) {
  const services = [];
  const itemRe =
    /<(?:li|div)[^>]*data-testid="service"[^>]*>[\s\S]*?data-testid="services-list-item-root"[\s\S]*?(?=<(?:li|div)[^>]*data-testid="service"|<\/(?:ul|section|div)>\s*<(?:h[23]|section))/gi;

  // Fallback: split on each service list item root.
  const roots = [
    ...html.matchAll(
      /data-service-id="(\d+)"[^>]*data-testid="services-list-item-root"[\s\S]*?(?=data-service-id="\d+"[^>]*data-testid="services-list-item-root"|$)/g,
    ),
  ];

  // Build category map by scanning document order of headings + service ids.
  const categoryById = new Map();
  let currentCategory = "Uncategorized";
  let currentSectionType = "manual";

  const markers = [
    ...html.matchAll(
      /<h([23])[^>]*>([\s\S]*?)<\/h\1>|data-service-id="(\d+)"/gi,
    ),
  ];

  for (const marker of markers) {
    if (marker[2] != null) {
      const heading = decodeHtml(marker[2].replace(/<[^>]+>/g, ""));
      if (!heading || /^(Services|Amenities|Reviews|Client photos|About us|Business hours|Booking Policies|Business details|Social Media|Fresh finds nearby)$/i.test(heading)) {
        if (/^Popular Services$/i.test(heading)) {
          currentCategory = "Popular Services";
          currentSectionType = "booksy_automatic";
        } else if (/^Services$/i.test(heading)) {
          currentCategory = "Uncategorized";
          currentSectionType = "manual";
        }
        continue;
      }
      currentCategory = heading
        .replace(/\s+Services$/i, "")
        .replace(/\s+/g, " ")
        .trim();
      currentSectionType = "manual";
      continue;
    }

    if (marker[3]) {
      categoryById.set(marker[3], {
        category: currentCategory,
        sectionType: currentSectionType,
      });
    }
  }

  const blocks =
    roots.length > 0
      ? roots.map((m) => ({ id: m[1], html: m[0] }))
      : [];

  for (const block of blocks) {
    const meta = categoryById.get(block.id) || {
      category: "Uncategorized",
      sectionType: "manual",
    };

    if (!options.includePopular && meta.sectionType === "booksy_automatic") {
      continue;
    }

    const name = extractFirst(
      /data-testid="service-name"[^>]*>\s*([\s\S]*?)\s*<\/h[34]>/,
      block.html,
    );
    const price =
      extractFirst(
        /data-testid="service-variant-price"[^>]*>\s*([^<]+)\s*<\/span>/,
        block.html,
      ) ||
      extractFirst(
        /data-testid="service-price"[^>]*>\s*([^<]+)\s*<\/(?:div|span)>/,
        block.html,
      );
    const duration =
      extractFirst(
        /data-testid="service-variant-duration"[^>]*>\s*([^<]+)\s*<\/span>/,
        block.html,
      ) ||
      extractFirst(
        /data-testid="service-duration"[^>]*>\s*([^<]+)\s*<\/span>/,
        block.html,
      );

    if (!name || !price) {
      continue;
    }

    services.push({
      id: block.id,
      category: meta.category,
      sectionType: meta.sectionType,
      name,
      price,
      duration,
    });
  }

  return services;
}

function extractServices(html, options = {}) {
  const current = extractServicesCurrent(html, options);
  if (current.length > 0) {
    return current;
  }
  return extractServicesLegacy(html, options);
}

function uniqueServices(services) {
  const byId = new Map();

  for (const service of services) {
    const existing = byId.get(service.id);
    if (!existing) {
      byId.set(service.id, service);
      continue;
    }

    // Prefer the real category entries over the duplicated "Popular Services" section.
    if (
      existing.sectionType === "booksy_automatic" &&
      service.sectionType !== "booksy_automatic"
    ) {
      byId.set(service.id, service);
    }
  }

  return [...byId.values()];
}

function renderText({ url, fetchedAt, services }) {
  const lines = [];
  const groups = new Map();

  for (const service of services) {
    if (!groups.has(service.category)) {
      groups.set(service.category, []);
    }
    groups.get(service.category).push(service);
  }

  lines.push(`Source: ${url}`);
  lines.push(`Fetched: ${fetchedAt}`);
  lines.push(`Services: ${services.length}`);
  lines.push("");

  for (const [category, items] of groups) {
    lines.push(category);
    for (const item of items) {
      lines.push(`- ${item.name} | ${item.price} | ${item.duration}`);
    }
    lines.push("");
  }

  return `${lines.join("\n").trim()}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    process.stdout.write(
      [
        "Usage: node scripts/booksy-services.mjs [--url <booksy-url>] [--format json|text] [--include-popular]",
        "",
        "Examples:",
        "  node scripts/booksy-services.mjs",
        "  node scripts/booksy-services.mjs --format text",
      ].join("\n"),
    );
    process.stdout.write("\n");
    return;
  }

  const html = execFileSync(
    "curl",
    [
      "-L",
      "--silent",
      "--fail",
      "-A",
      "Mozilla/5.0 (compatible; BandOfMenServiceSync/1.0)",
      args.url,
    ],
    { encoding: "utf8" },
  );
  const services = uniqueServices(extractServices(html, args));

  if (services.length === 0) {
    throw new Error("No services found in the Booksy page HTML.");
  }

  const payload = {
    url: args.url,
    fetchedAt: new Date().toISOString(),
    serviceCount: services.length,
    services,
  };

  if (args.format === "text") {
    process.stdout.write(renderText(payload));
    return;
  }

  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
