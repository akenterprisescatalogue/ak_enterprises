import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, ".tmp-medico");
const BUCKET = "product-media";
const DEFAULT_SOURCE_PATH = "C:\\Users\\ANC\\.codex\\attachments\\6a68b822-62be-4ba1-9038-fa4b192cdbd9\\pasted-text.txt";
const DEFAULT_IMAGE_ROOT = "E:\\Umer brands\\Medico";
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

const PRICE_ROWS = [
  ["Medico AND-75 Aneroid Meter", 2352.14, 1680.1],
  ["Medico AND-85 Aneroid Meter", 2806.72, 2004.8],
  ["Medico Blood Pressure Upper Arm BPM-45 Machine", 8950, 5776.72],
  ["Medico BP Monitor BP-42 Wrist Machine", 4782.26, 3415.9],
  ["Medico BR-105 Breast Electric Pump", 7839.73, 5599.8],
  ["Medico BR-103 Breast Manual Pump", 1960.14, 1400.1],
  ["Medico ST-21 Steth", 862.43, 616.02],
  ["Medico Cardiology ST-28 Steth Burgundy", 3292.8, 2352],
  ["Medico Cardiology ST-28 Special Edition Steth Black", 3700.48, 2643.2],
  ["Medico Cardiology ST-28 Steth Blue", 3292.8, 2352],
  ["Medico Cardiology ST-28 Special Edition Steth Grey", 3700.48, 2643.2],
  ["Medico ST-28 Special Edition Steth Burgundy", 3700.48, 2643.2],
  ["Medico ST-28 Special Edition Steth Blue", 3700.48, 2643.2],
  ["Medico Cardiology ST-28 Steth Grey", 3292.8, 2352],
  ["Medico Cardiology ST-28 Steth Black", 3584.18, 2560.13],
  ["Medico ST-11 Special Edition Steth Burgundy", 2587.04, 1847.89],
  ["Medico ST-11 Special Edition Steth Black", 2587.04, 1847.89],
  ["Medico ST-11 Special Edition Steth Blue", 2587.06, 1847.9],
  ["Medico ST-11 Special Edition Steth Grey", 2587.06, 1847.9],
  ["Medico Pediatric Profesional (HS-30H) Steth Black", 4104.22, 2931.59],
  ["Medico Nebulizer NB-90 Machine", 6850, 3528],
  ["Medico Nebulizer NB-95 Machine", 6990, 3976],
  ["Medico Therapy Nebulizer NB-97 Machine", 7550, 3528],
  ["Medico FPO-109 Finger Tip PulseOximeter Meter", 4990, 2519.84],
  ["Medico Rigid DT-40 Thermometer", 590, 369.59],
  ["Medico Flex FT-33 Thermometer", 690, 414.39],
  ["Medico Air Mattress AM-25 Machine", 7513.78, 5366.98],
  ["Medico Nb-100 Mesh Nebulizer Machine", 7450, 3932.43],
  ["Medico Nb-110 Mesh Nebulizer Machine", 6790, 4345.48],
  ["Medico PS-220 Personal Bilancia Digital Scale", 3214.45, 2296.03],
  ["Medico PS-220 Personal Bilancia Digital N Scale", 3214.37, 2295.98],
  ["Medico PS-350 Personal Electronic Bambo Digital Scale", 4861.13, 3472.24],
  ["Medico PS-350 Personal Electronic Bambo Digital N Scale", 4860.8, 3472],
  ["Medico PS-400 Smart Body Fat Scale", 4312.17, 3080.12],
  ["Medico PS-400 Smart Body Fat N Scale", 4230.15, 3021.54],
  ["Medico BMI-50 Personal Body Mass Index N Scale", 6820.74, 4871.96],
  ["Medico HP-10 Heating Pad", 5174.34, 3695.96],
  ["Medico HN-18 Back & Neck Heating Pad", 6927.06, 4947.9],
  ["Medico Forehead Thermometer FT-15 Gun", 5990, 2688.28],
  ["Medico Intelligent Massager MG-150 Gun", 5958.24, 4255.88],
  ["Medico Intelligent Massager MG-160 Gun", 5315.72, 3796.94],
  ["Medico Dgt BPC-02 Cuff Adult Large 22-42cm Kit", 744.81, 532.01],
  ["Medico Dgt BPC-01 Cuff Adult 22-36cm Kit", 627.18, 447.99],
  ["Medico BPC-04 Cotton Cuff Latex Bladder 22-36cm Kit", 721.28, 515.2],
];

const IMAGE_OVERRIDES = {
  "Medico AND-75 Aneroid Meter": ["Medico  AND  75 Android Meter"],
  "Medico AND-85 Aneroid Meter": ["Medico AND 85 Android Meter"],
  "Medico Blood Pressure Upper Arm BPM-45 Machine": ["Medico Blood Pressure Upper Arm  BPM .45  Machine"],
  "Medico BP Monitor BP-42 Wrist Machine": ["MEDICO BP WRIST"],
  "Medico BR-105 Breast Electric Pump": ["Medico BR- 105 Breast Electric  pump"],
  "Medico BR-103 Breast Manual Pump": ["Medico BR- 103 Brest Manual pump"],
  "Medico ST-21 Steth": ["Medico ST-21 Steth_"],
  "Medico Cardiology ST-28 Steth Burgundy": ["Medico Cardiologi  ST -28 Steth Burgundy"],
  "Medico Cardiology ST-28 Special Edition Steth Black": ["Medico cardiologi. St- 28 Special Edition Steth Black _"],
  "Medico Cardiology ST-28 Steth Blue": ["Medico Cardiologi ST- 28  Steth Blue_"],
  "Medico Cardiology ST-28 Special Edition Steth Grey": ["Medico Cardiologi St-28 Special Edition Steth Grey_"],
  "Medico ST-28 Special Edition Steth Burgundy": ["Medico ST-28 Special Edition Steth  Burgundy_"],
  "Medico ST-28 Special Edition Steth Blue": ["Medico ST - 28 Special Edition  Steth Blue"],
  "Medico Cardiology ST-28 Steth Grey": ["Medico Cardiologi ST-28 Grey Steth_"],
  "Medico Cardiology ST-28 Steth Black": ["Medico Cardiologi  ST - 28 Steth  Black"],
  "Medico ST-11 Special Edition Steth Burgundy": ["Medico ST-11 Special  Edition Steth  Burgundy_"],
  "Medico ST-11 Special Edition Steth Black": ["Medico ST - 11 special Edition  Steth Black"],
  "Medico ST-11 Special Edition Steth Blue": ["Medico ST-11 Special Edition Steth Blue"],
  "Medico ST-11 Special Edition Steth Grey": ["Medico ST-11 Special Edition  Steth Grey_"],
  "Medico Pediatric Profesional (HS-30H) Steth Black": [],
  "Medico Nebulizer NB-90 Machine": ["Medico Nebulizer  NB-90  Machine", "MEDICA NEBULIZER\\MEDICO NEBULIZER NB-90 MACHINE"],
  "Medico Nebulizer NB-95 Machine": ["Medico Nebulizer NB-95 Machine", "MEDICA NEBULIZER\\MEDICO NEBULIZER  NB-95 MACHINE"],
  "Medico Therapy Nebulizer NB-97 Machine": ["Medico Therapy Nebulizer  NB97", "MEDICA NEBULIZER\\MEDICO THERAPY NEBULIZER NB-97 MACHINE"],
  "Medico FPO-109 Finger Tip PulseOximeter Meter": ["Medico Finger tip FPO 109 pulse oximeter"],
  "Medico Rigid DT-40 Thermometer": ["Medico Rigid DT-40  Thermometer"],
  "Medico Flex FT-33 Thermometer": ["Medico Flex FT 33 Thermometer"],
  "Medico Air Mattress AM-25 Machine": ["Medico Air Mattress. AM - 25", "Medico Air Metters .AM 25  Machine_"],
  "Medico Nb-100 Mesh Nebulizer Machine": ["Medico NB 100 Mesh Nebulizer  Machine", "MEDICA NEBULIZER\\MEDICO NB-100 MESH NEBULIZER MACHINE"],
  "Medico Nb-110 Mesh Nebulizer Machine": ["Medico MB 110 Mesh Nebulizer Machine", "MEDICA NEBULIZER\\MEDICO NB-110 MESH NEBULIZER MACHINE"],
  "Medico PS-220 Personal Bilancia Digital N Scale": ["Medico PS-220 personal Bilancia  Digital N Scale"],
  "Medico PS-350 Personal Electronic Bambo Digital N Scale": ["Medico PS -350 Personal Electronic  Bambi digital N scale_"],
  "Medico PS-400 Smart Body Fat N Scale": ["Medico PS 400 Smart Body Fat N scale"],
  "Medico BMI-50 Personal Body Mass Index N Scale": ["Medico BMI_ 50 personal Body Mass  index N scale"],
  "Medico HP-10 Heating Pad": ["Medico HP-10  Heating pad"],
  "Medico HN-18 Back & Neck Heating Pad": ["Medico HN- 18 Heating pad"],
  "Medico Forehead Thermometer FT-15 Gun": ["Medico Forehead  Thermometer FT15 Gun"],
  "Medico Intelligent Massager MG-150 Gun": ["Medico intelligent Massager Gun MG.150"],
  "Medico Intelligent Massager MG-160 Gun": ["Medico intelligent Massager gun MG 160"],
  "Medico Dgt BPC-02 Cuff Adult Large 22-42cm Kit": ["Medico Dgt BPC -02 cuff Adult 22-42cm kit"],
  "Medico Dgt BPC-01 Cuff Adult 22-36cm Kit": ["Medico Dgt BPC cuff Adult  22-36 cm kit"],
  "Medico BPC-04 Cotton Cuff Latex Bladder 22-36cm Kit": [
    "Medico BPC -04  cotton Cuff Latex  bladder  22-36cm kit",
  ],
};

function usage() {
  console.log(`Usage:
  node scripts/import-medico.mjs --prepare
  node scripts/import-medico.mjs --upload-priced
  node scripts/import-medico.mjs --verify

Optional:
  --source "C:\\path\\pasted-text.txt"
  --image-root "E:\\path\\Medico"
`);
}

function getArg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/\uFEFF/g, "")
    .replace(/\u00e2\u20ac[\u201d\u201c]/g, " - ")
    .replace(/\u00e2\u20ac\u00a2/g, "-")
    .replace(/\u00e2\u201a\u201a/g, "2")
    .replace(/\u00e2\u2030\u00a5/g, ">=")
    .replace(/\u00e2\u2030\u00a4/g, "<=")
    .replace(/\u00e2\u20ac\u2122/g, "'")
    .replace(/\u00e2\u20ac\u02dc/g, "'")
    .replace(/\u00e2\u20ac[\u0153\ufffd]/g, '"')
    .replace(/\u00c3\u2014/g, "x")
    .replace(/\u00c2\u00b1/g, "+/-")
    .replace(/\u00c2\u00b0C/g, "C")
    .replace(/\u00c2\u00b5/g, "mc")
    .replace(/\u00c2/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&mdash;|&ndash;/gi, " - ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanFeature(value) {
  return cleanText(value)
    .replace(/^["']/, "")
    .replace(/["']$/, "")
    .replace(/^[-\u2022]\s*/, "")
    .trim();
}

function normalize(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/madico|medica/g, "medico")
    .replace(/android/g, "aneroid")
    .replace(/cardiologi/g, "cardiology")
    .replace(/uper/g, "upper")
    .replace(/brest/g, "breast")
    .replace(/metters/g, "mattress")
    .replace(/bambi|bamboo/g, "bambo")
    .replace(/\bmb\s*110\b/g, "nb110")
    .replace(/\bnb\s*110\b/g, "nb110")
    .replace(/\bnb\s*100\b/g, "nb100")
    .replace(/\bnb\s*90\b/g, "nb90")
    .replace(/\bnb\s*95\b/g, "nb95")
    .replace(/\bnb\s*97\b/g, "nb97")
    .replace(/pulseoximeter/g, "pulse oximeter")
    .replace(/[\W_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function createSlug(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function parseProducts(sourcePath) {
  const text = readFileSync(sourcePath, "utf8");
  const lines = text.split(/\r?\n/);
  const products = [];
  let current = null;

  function finishCurrent() {
    if (!current) return;
    const features = current.featureLines.map(cleanFeature).filter(Boolean);
    products.push({
      ...current,
      features,
      description: features.map((feature) => `\u2022 ${feature}`).join("\n"),
    });
    current = null;
  }

  for (const rawLine of lines) {
    const rowMatch = rawLine.match(/^\s*(\d+)\t/);

    if (rowMatch) {
      finishCurrent();
      const cells = rawLine.split("\t").map((cell) => cleanText(cell));
      const serial = Number(cells[0]);
      const subcategory = cells[1];
      const secondSubcategory = cells[2];
      const name = cells[4] || cells[3];
      const featureStart = cells[4] ? 5 : 4;

      current = {
        serial,
        subcategory,
        secondSubcategory,
        name,
        slug: `medico-${createSlug(name)}-${serial}`,
        featureLines: cells.slice(featureStart).filter(Boolean),
      };
      if (current.featureLines.at(-1)?.trim().endsWith('"')) finishCurrent();
      continue;
    }

    if (current) {
      const line = rawLine.trim();
      if (line) {
        current.featureLines.push(line);
        if (line.endsWith('"')) finishCurrent();
      }
    }
  }

  finishCurrent();
  return products;
}

function priceMap() {
  return new Map(
    PRICE_ROWS.map(([name, mrpPrice, offeredPrice]) => [
      normalize(name),
      {
        name,
        mrpPrice: roundMoney(mrpPrice),
        offeredPrice: roundMoney(offeredPrice),
      },
    ])
  );
}

async function listImageFiles(root) {
  const files = [];

  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      if (entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        files.push({
          fullPath,
          relativePath: path.relative(root, fullPath),
          relativeDir: path.relative(root, path.dirname(fullPath)),
          leafDir: path.basename(path.dirname(fullPath)),
        });
      }
    }
  }

  await walk(root);
  return files;
}

function groupImageFiles(files) {
  const groups = new Map();
  for (const file of files) {
    if (!groups.has(file.relativeDir)) {
      groups.set(file.relativeDir, {
        relativeDir: file.relativeDir,
        leafDir: file.leafDir,
        files: [],
      });
    }
    groups.get(file.relativeDir).files.push(file);
  }
  return [...groups.values()];
}

function tokenScore(left, right) {
  const leftTokens = new Set(normalize(left).split(" ").filter(Boolean));
  const rightTokens = new Set(normalize(right).split(" ").filter(Boolean));
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;

  let shared = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) shared += 1;
  }

  return shared / Math.max(leftTokens.size, rightTokens.size);
}

function findImageGroups(product, groups) {
  const overrides = IMAGE_OVERRIDES[product.name];
  if (overrides) {
    const matched = [];
    for (const fragment of overrides) {
      const wanted = normalize(fragment);
      matched.push(
        ...groups.filter((group) => normalize(group.relativeDir).includes(wanted) || normalize(group.leafDir).includes(wanted))
      );
    }
    return [...new Map(matched.map((group) => [group.relativeDir, group])).values()];
  }

  let best = null;
  for (const group of groups) {
    const score = Math.max(tokenScore(product.name, group.leafDir), tokenScore(product.name, group.relativeDir) * 0.85);
    if (!best || score > best.score) best = { group, score };
  }

  return best && best.score >= 0.68 ? [best.group] : [];
}

async function imageEntriesForProduct(product, groups) {
  const imageGroups = findImageGroups(product, groups);
  const entries = [];
  const seenHashes = new Set();

  for (const group of imageGroups) {
    for (const file of group.files) {
      const bytes = await readFile(file.fullPath);
      const hash = createHash("sha1").update(bytes).digest("hex").slice(0, 12);
      if (seenHashes.has(hash)) continue;
      seenHashes.add(hash);
      entries.push({
        ...file,
        hash,
        bytes: bytes.length,
      });
    }
  }

  return entries.sort((first, second) => first.relativePath.localeCompare(second.relativePath));
}

async function buildManifest(sourcePath, imageRoot) {
  if (!existsSync(sourcePath)) throw new Error(`MEDICO source file not found: ${sourcePath}`);
  if (!existsSync(imageRoot)) throw new Error(`MEDICO image root not found: ${imageRoot}`);

  const prices = priceMap();
  const products = parseProducts(sourcePath).map((product) => {
    const price = prices.get(normalize(product.name)) ?? null;
    return {
      ...product,
      mrpPrice: price?.mrpPrice ?? null,
      offeredPrice: price?.offeredPrice ?? null,
      hasPrice: Boolean(price),
    };
  });

  const productsByName = new Set(products.map((product) => normalize(product.name)));
  const unmatchedPriceRows = PRICE_ROWS.filter(([name]) => !productsByName.has(normalize(name))).map(([name]) => name);
  const groups = groupImageFiles(await listImageFiles(imageRoot));
  const productsWithImages = [];

  for (const product of products) {
    const imageEntries = await imageEntriesForProduct(product, groups);
    productsWithImages.push({
      ...product,
      imageEntries,
      imagePaths: imageEntries.map((entry) => entry.fullPath),
      imageRelativePaths: imageEntries.map((entry) => entry.relativePath),
      imageCount: imageEntries.length,
    });
  }

  const uploadProducts = productsWithImages.filter((product) => product.hasPrice);

  return {
    generatedAt: new Date().toISOString(),
    sourcePath,
    imageRoot,
    products: productsWithImages.map(({ imageEntries, ...product }) => product),
    summary: {
      totalSourceProducts: productsWithImages.length,
      pricedSourceProducts: uploadProducts.length,
      sourceProductsMissingPrices: productsWithImages.filter((product) => !product.hasPrice).length,
      pricedProductsWithImages: uploadProducts.filter((product) => product.imageCount > 0).length,
      pricedProductsWithoutImages: uploadProducts.filter((product) => product.imageCount === 0).length,
      productsMissingFeatures: productsWithImages.filter((product) => product.features.length === 0).length,
      unmatchedPriceRows: unmatchedPriceRows.length,
    },
    missingPriceProducts: productsWithImages.filter((product) => !product.hasPrice).map((product) => `${product.serial}. ${product.name}`),
    missingImageProducts: uploadProducts.filter((product) => product.imageCount === 0).map((product) => `${product.serial}. ${product.name}`),
    unmatchedPriceRows,
    uploadProducts,
  };
}

function ensureOutputDir() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

async function writeManifest(manifest) {
  ensureOutputDir();
  const jsonPath = path.join(OUTPUT_DIR, "medico-import-manifest.json");
  const csvPath = path.join(OUTPUT_DIR, "medico-import-manifest.csv");
  const summaryPath = path.join(OUTPUT_DIR, "medico-import-summary.txt");

  const csvRows = [
    [
      "serial",
      "subcategory",
      "second_subcategory",
      "product_name",
      "mrp_price",
      "offered_price",
      "has_price",
      "image_count",
      "feature_count",
      "image_paths",
      "slug",
    ],
    ...manifest.products.map((product) => [
      product.serial,
      product.subcategory,
      product.secondSubcategory,
      product.name,
      product.mrpPrice ?? "",
      product.offeredPrice ?? "",
      product.hasPrice,
      product.imageCount,
      product.features.length,
      product.imageRelativePaths.join(" | "),
      product.slug,
    ]),
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");

  const summary = [
    "MEDICO import manifest",
    `Generated: ${manifest.generatedAt}`,
    `Source: ${manifest.sourcePath}`,
    `Image root: ${manifest.imageRoot}`,
    "",
    `Total source products: ${manifest.summary.totalSourceProducts}`,
    `Priced source products: ${manifest.summary.pricedSourceProducts}`,
    `Source products missing prices: ${manifest.summary.sourceProductsMissingPrices}`,
    `Priced products with images: ${manifest.summary.pricedProductsWithImages}`,
    `Priced products without images: ${manifest.summary.pricedProductsWithoutImages}`,
    `Products missing features: ${manifest.summary.productsMissingFeatures}`,
    `Price rows not found in feature source: ${manifest.summary.unmatchedPriceRows}`,
    "",
    "Missing price products:",
    ...(manifest.missingPriceProducts.length ? manifest.missingPriceProducts.map((item) => `- ${item}`) : ["- none"]),
    "",
    "Missing image products among priced uploads:",
    ...(manifest.missingImageProducts.length ? manifest.missingImageProducts.map((item) => `- ${item}`) : ["- none"]),
    "",
    "Price rows not found in feature source:",
    ...(manifest.unmatchedPriceRows.length ? manifest.unmatchedPriceRows.map((item) => `- ${item}`) : ["- none"]),
  ].join("\n");

  await writeFile(jsonPath, JSON.stringify(manifest, null, 2));
  await writeFile(csvPath, csvRows);
  await writeFile(summaryPath, summary);

  return { jsonPath, csvPath, summaryPath };
}

function loadEnv() {
  const envPath = path.join(PROJECT_ROOT, ".env");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function getSupabaseClient() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function upsertByConflict(client, table, payload, onConflict) {
  const { data, error } = await client.from(table).upsert(payload, { onConflict }).select("*").single();
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
}

async function ensureBucket(client) {
  const { error: bucketError } = await client.storage.getBucket(BUCKET);
  if (!bucketError) return;

  const { error } = await client.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
  });
  if (error) throw new Error(`storage bucket: ${error.message}`);
}

async function uploadProductImages(client, product) {
  const urls = [];
  const seenHashes = new Set();

  for (const [index, imagePath] of product.imagePaths.entries()) {
    const bytes = await readFile(imagePath);
    const hash = createHash("sha1").update(bytes).digest("hex").slice(0, 12);
    if (seenHashes.has(hash)) continue;
    seenHashes.add(hash);

    const extension = path.extname(imagePath).toLowerCase() || ".png";
    const contentType = extension === ".jpg" || extension === ".jpeg" ? "image/jpeg" : `image/${extension.replace(".", "")}`;
    const storagePath = `images/medico/${product.slug}/${String(index + 1).padStart(2, "0")}-${hash}${extension}`;
    const { error } = await client.storage.from(BUCKET).upload(storagePath, bytes, {
      contentType,
      upsert: true,
    });
    if (error) throw new Error(`storage upload ${product.name}: ${error.message}`);

    const { data } = client.storage.from(BUCKET).getPublicUrl(storagePath);
    urls.push(data.publicUrl);
  }

  return urls;
}

async function uploadPricedProducts(manifest) {
  const client = getSupabaseClient();
  await ensureBucket(client);

  const mainCategory = await upsertByConflict(
    client,
    "main_categories",
    {
      name: "Surgical Products",
      slug: "surgical-products",
      description: "Surgical instruments, devices, monitors, therapy products, and medical equipment.",
      sort_order: 1,
    },
    "slug"
  );

  const brand = await upsertByConflict(
    client,
    "brands",
    {
      main_category_id: mainCategory.id,
      name: "MEDICO",
      slug: "medico",
      description: "MEDICO surgical devices, diagnostic equipment, and therapy products.",
      sort_order: 3,
    },
    "main_category_id,slug"
  );

  const subcategoryCache = new Map();
  const secondSubcategoryCache = new Map();

  async function getSubcategory(name) {
    const key = normalize(name);
    if (subcategoryCache.has(key)) return subcategoryCache.get(key);

    const subcategory = await upsertByConflict(
      client,
      "subcategories",
      {
        brand_id: brand.id,
        name,
        slug: createSlug(name),
        description: `${name} products from MEDICO.`,
        sort_order: subcategoryCache.size + 1,
      },
      "brand_id,slug"
    );
    subcategoryCache.set(key, subcategory);
    return subcategory;
  }

  async function getSecondSubcategory(subcategory, name) {
    const key = `${subcategory.id}:${normalize(name)}`;
    if (secondSubcategoryCache.has(key)) return secondSubcategoryCache.get(key);

    const secondSubcategory = await upsertByConflict(
      client,
      "second_subcategories",
      {
        subcategory_id: subcategory.id,
        name,
        slug: createSlug(name),
        description: `${name} products from MEDICO.`,
        sort_order: secondSubcategoryCache.size + 1,
      },
      "subcategory_id,slug"
    );
    secondSubcategoryCache.set(key, secondSubcategory);
    return secondSubcategory;
  }

  const uploaded = [];
  for (const product of manifest.uploadProducts) {
    const subcategory = await getSubcategory(product.subcategory);
    const secondSubcategory = await getSecondSubcategory(subcategory, product.secondSubcategory);
    const imageUrls = await uploadProductImages(client, product);

    const payload = {
      main_category_id: mainCategory.id,
      brand_id: brand.id,
      subcategory_id: subcategory.id,
      second_subcategory_id: secondSubcategory.id,
      name: product.name,
      slug: product.slug,
      sku: null,
      description: product.description,
      highlights: [],
      image_urls: imageUrls,
      video_urls: [],
      mrp_price: product.mrpPrice,
      offered_price: product.offeredPrice,
      pack_size: null,
      availability: "In Stock",
      tags: ["MEDICO", "Surgical Products", product.subcategory, product.secondSubcategory],
      is_active: true,
    };

    const { data, error } = await client.from("products").upsert(payload, { onConflict: "slug" }).select("id,name").single();
    if (error) throw new Error(`products: ${product.name}: ${error.message}`);
    uploaded.push(data);
  }

  const uploadSummaryPath = path.join(OUTPUT_DIR, "medico-upload-summary.json");
  await writeFile(uploadSummaryPath, JSON.stringify({ uploaded, count: uploaded.length }, null, 2));
  return { uploaded: uploaded.length, file: uploadSummaryPath };
}

async function verifyUpload() {
  const client = getSupabaseClient();
  const { data: brand, error: brandError } = await client
    .from("brands")
    .select("id,name")
    .eq("slug", "medico")
    .single();

  if (brandError) throw new Error(`brand: ${brandError.message}`);

  const { data: products, error, count } = await client
    .from("products")
    .select("id,name,mrp_price,offered_price,image_urls,description,subcategories(name),second_subcategories(name)", { count: "exact" })
    .eq("brand_id", brand.id)
    .order("name");

  if (error) throw new Error(`products: ${error.message}`);

  return {
    brand,
    count,
    productsWithImages: products.filter((product) => product.image_urls?.length).length,
    productsWithoutImages: products.filter((product) => !product.image_urls?.length).length,
    productsWithDescriptions: products.filter((product) => product.description?.trim()).length,
    sample: products.slice(0, 10).map((product) => ({
      name: product.name,
      subcategory: product.subcategories?.name,
      secondSubcategory: product.second_subcategories?.name,
      mrp: product.mrp_price,
      offered: product.offered_price,
      images: product.image_urls?.length ?? 0,
      descriptionLines: product.description?.split(/\n/).filter(Boolean).length ?? 0,
    })),
  };
}

async function main() {
  const command = process.argv.find((arg) => arg.startsWith("--"));
  const sourcePath = getArg("--source", DEFAULT_SOURCE_PATH);
  const imageRoot = getArg("--image-root", DEFAULT_IMAGE_ROOT);

  if (!command || command === "--help") {
    usage();
    return;
  }

  if (command === "--prepare") {
    const manifest = await buildManifest(sourcePath, imageRoot);
    const files = await writeManifest(manifest);
    console.log(
      JSON.stringify(
        {
          summary: manifest.summary,
          missingPriceProducts: manifest.missingPriceProducts,
          missingImageProducts: manifest.missingImageProducts,
          unmatchedPriceRows: manifest.unmatchedPriceRows,
          files,
        },
        null,
        2
      )
    );
    return;
  }

  if (command === "--upload-priced" || command === "--upload") {
    const manifest = await buildManifest(sourcePath, imageRoot);
    const files = await writeManifest(manifest);
    console.log(
      JSON.stringify(
        {
          summary: manifest.summary,
          missingPriceProducts: manifest.missingPriceProducts,
          missingImageProducts: manifest.missingImageProducts,
          unmatchedPriceRows: manifest.unmatchedPriceRows,
          files,
        },
        null,
        2
      )
    );
    const result = await uploadPricedProducts(manifest);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "--verify") {
    console.log(JSON.stringify(await verifyUpload(), null, 2));
    return;
  }

  usage();
  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
