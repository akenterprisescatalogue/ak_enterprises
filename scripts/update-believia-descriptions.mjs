import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, ".tmp-believia");
const DEFAULT_FEATURES_FILE =
  "C:\\Users\\ANC\\.codex\\attachments\\2200beda-5050-4b68-8364-8363af0f5017\\pasted-text.txt";

function getArg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/believa|belivia/g, "believia")
    .replace(/0i01/g, "oi01")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/\uFEFF/g, "")
    .replace(/â€¢/g, "•")
    .replace(/â€”|â€“/g, "-")
    .replace(/Â±/g, "±")
    .replace(/Â°/g, "°")
    .replace(/Âµ/g, "µ")
    .replace(/Â/g, "")
    .replace(/â‰¥/g, "≥")
    .replace(/â‰¤/g, "≤")
    .replace(/â‚‚/g, "2")
    .replace(/â€™/g, "'")
    .replace(/â€˜/g, "'")
    .replace(/â€œ|â€�/g, '"')
    .replace(/\r/g, "")
    .trim();
}

function parseFeatureRows(filePath) {
  const text = readFileSync(filePath, "utf8");
  const rows = [];
  let current = null;

  function finishCurrent() {
    if (!current) return;
    const rawFeatures = cleanText(current.featureLines.join("\n").replace(/^"+|"+$/g, ""));
    const features = rawFeatures
      .split(/\n+/)
      .map((line) => cleanText(line).replace(/^["•\s]+/, "").replace(/"+$/g, "").trim())
      .filter(Boolean);

    rows.push({
      serial: current.serial,
      name: cleanText(current.name),
      features,
      description: features.map((feature) => `• ${feature}`).join("\n"),
    });
    current = null;
  }

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (/^\d+\t/.test(line)) {
      finishCurrent();
      const parts = line.split("\t");
      current = {
        serial: Number(parts[0].trim()),
        name: parts[4]?.trim() ?? "",
        featureLines: [parts.slice(5).join("\t")],
      };
      continue;
    }

    if (current && /^"?\s*(â€¢|•)/.test(line.trim())) {
      current.featureLines.push(line.trim());
    }
  }
  finishCurrent();

  return rows.filter((row) => row.name && row.description);
}

function loadEnv() {
  const envPath = path.join(PROJECT_ROOT, ".env");
  if (!existsSync(envPath)) return {};
  const env = {};
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

async function main() {
  const featuresFile = getArg("--features-file", DEFAULT_FEATURES_FILE);
  const dryRun = process.argv.includes("--dry-run");
  if (!existsSync(featuresFile)) {
    throw new Error(`Features file not found: ${featuresFile}`);
  }

  const env = { ...loadEnv(), ...process.env };
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.");
  }

  const featureRows = parseFeatureRows(featuresFile);
  const featureMap = new Map(featureRows.map((row) => [normalize(row.name), row]));
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: brand, error: brandError } = await client.from("brands").select("id,name").eq("slug", "believia").single();
  if (brandError) throw new Error(`brands: ${brandError.message}`);

  const { data: products, error: productError } = await client
    .from("products")
    .select("id,name,slug,description")
    .eq("brand_id", brand.id);
  if (productError) throw new Error(`products: ${productError.message}`);

  const updated = [];
  const unchanged = [];
  const missingFeatureRows = [];

  for (const product of products) {
    const featureRow = featureMap.get(normalize(product.name));
    if (!featureRow) {
      missingFeatureRows.push(product.name);
      continue;
    }

    if (product.description === featureRow.description) {
      unchanged.push(product.name);
      continue;
    }

    if (!dryRun) {
      const { error } = await client
        .from("products")
        .update({ description: featureRow.description, updated_at: new Date().toISOString() })
        .eq("id", product.id);
      if (error) throw new Error(`update ${product.name}: ${error.message}`);
    }
    updated.push({ name: product.name, featureCount: featureRow.features.length });
  }

  const uploadedNameSet = new Set(products.map((product) => normalize(product.name)));
  const skippedBecauseNotUploaded = featureRows
    .filter((row) => !uploadedNameSet.has(normalize(row.name)))
    .map((row) => row.name);

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const summary = {
    dryRun,
    featureRows: featureRows.length,
    believiaProductsFound: products.length,
    updatedCount: updated.length,
    unchangedCount: unchanged.length,
    missingFeatureRows,
    skippedBecauseNotUploaded,
    updated,
  };
  const summaryPath = path.join(OUTPUT_DIR, "believia-description-update-summary.json");
  await writeFile(summaryPath, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ ...summary, summaryPath }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
