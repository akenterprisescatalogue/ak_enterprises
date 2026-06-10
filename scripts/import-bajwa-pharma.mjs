import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, ".tmp-bajwa");
const BUCKET = "product-media";
const DEFAULT_MARKDOWN_PATH = "C:\\Users\\ANC\\Downloads\\product_list_with_features.md";
const DEFAULT_IMAGES_HTML_PATH = "C:\\Users\\ANC\\Downloads\\bajwa_pharma_product_images.html";

function usage() {
  console.log(`Usage:
  node scripts/import-bajwa-pharma.mjs --prepare
  node scripts/import-bajwa-pharma.mjs --upload
  node scripts/import-bajwa-pharma.mjs --verify

Optional:
  --markdown "C:\\path\\product_list_with_features.md"
  --images-html "C:\\path\\bajwa_pharma_product_images.html"
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
    .replace(/\u00e2\u20ac\u2122/g, "'")
    .replace(/\u00e2\u20ac\u02dc/g, "'")
    .replace(/\u00e2\u20ac[\u0153\ufffd]/g, '"')
    .replace(/\u00c2/g, "")
    .replace(/â€¢/g, "-")
    .replace(/â€”|â€“/g, " - ")
    .replace(/â‰¥/g, ">=")
    .replace(/â‰¤/g, "<=")
    .replace(/Â±/g, "+/-")
    .replace(/Â°/g, " degrees ")
    .replace(/Âµ/g, "mc")
    .replace(/Â/g, "")
    .replace(/â€™/g, "'")
    .replace(/â€˜/g, "'")
    .replace(/â€œ|â€�/g, '"')
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&mdash;|&ndash;/gi, " - ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanFeature(value) {
  return cleanText(value)
    .replace(/^[-•]\s*/, "")
    .trim();
}

function normalize(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function createSlug(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function parsePrice(value) {
  const cleaned = cleanText(value).replace(/,/g, "");
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return Math.round((parsed + Number.EPSILON) * 100) / 100;
}

function splitMarkdownTableLine(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((part) => cleanText(part));
}

function getShortTitle(fullTitle) {
  const title = cleanText(fullTitle);
  return title.split(/\s+-\s+/)[0]?.trim() || title;
}

function parseMarkdownProducts(markdownPath) {
  const text = readFileSync(markdownPath, "utf8");
  const lines = text.split(/\r?\n/);
  const products = [];
  let currentSection = "General";
  let pendingRows = [];
  let collectingFeatures = false;
  let featureLines = [];

  function applyFeatures() {
    if (pendingRows.length === 0) return;
    const features = featureLines.map(cleanFeature).filter(Boolean);
    for (const product of pendingRows) {
      product.features = features;
      product.description = features.map((feature) => `\u2022 ${feature}`).join("\n");
      products.push(product);
    }
    pendingRows = [];
    featureLines = [];
    collectingFeatures = false;
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith("## ")) {
      applyFeatures();
      currentSection = cleanText(line.replace(/^##\s+/, "")).replace(/\s+/g, " ");
      continue;
    }

    if (/^\|\s*\d+\s*\|/.test(line)) {
      collectingFeatures = false;
      const cells = splitMarkdownTableLine(line);
      if (cells.length < 6) continue;
      const [serialText, regNo, fullTitle, packSize, mrp, tradePrice] = cells;
      const serial = Number(serialText);
      const shortTitle = getShortTitle(fullTitle);
      const packSlug = createSlug(packSize) || String(serial);
      const baseSlug = createSlug(`${shortTitle}-${packSlug}`);
      const slug = `bajwa-${baseSlug}-${serial}`;

      pendingRows.push({
        serial,
        regNo: regNo === "-" || regNo === "—" ? null : regNo,
        section: currentSection,
        fullTitle,
        shortTitle,
        name: fullTitle,
        packSize,
        mrpPrice: parsePrice(mrp),
        offeredPrice: parsePrice(tradePrice),
        slug,
        features: [],
        description: "",
      });
      continue;
    }

    if (/^\*\*Key Features:\*\*/i.test(line)) {
      collectingFeatures = true;
      featureLines = [];
      continue;
    }

    if (line === "---") {
      applyFeatures();
      continue;
    }

    if (collectingFeatures && /^-\s+/.test(line)) {
      featureLines.push(line);
    }
  }

  applyFeatures();
  return products;
}

function stripTags(value) {
  return cleanText(String(value ?? "").replace(/<[^>]*>/g, ""));
}

function parseImageRows(imagesHtmlPath) {
  const html = readFileSync(imagesHtmlPath, "utf8");
  const rows = [];
  const rowRegex =
    /<tr>[\s\S]*?<td class="sr">([\s\S]*?)<\/td>[\s\S]*?<td class="name">([\s\S]*?)<\/td>[\s\S]*?<td class="img-cell">([\s\S]*?)<\/td>[\s\S]*?<\/tr>/g;

  for (const match of html.matchAll(rowRegex)) {
    const sr = Number(stripTags(match[1]));
    const name = stripTags(match[2]);
    const imageCell = match[3];
    const src = imageCell.match(/<img[^>]+src="([^"]+)"/i)?.[1] ?? null;
    const dataUrl = src?.startsWith("data:image/") ? src : null;
    rows.push({ sr, name, dataUrl, hasImage: Boolean(dataUrl) });
  }

  return rows;
}

function scoreImageMatch(productTitle, imageTitle) {
  const product = normalize(productTitle);
  const image = normalize(imageTitle);
  if (!product || !image) return 0;
  if (product === image) return 1000;
  if (product.includes(image) || image.includes(product)) return 900;

  const productTokens = new Set(product.split(" "));
  const imageTokens = new Set(image.split(" "));
  let shared = 0;
  for (const token of productTokens) {
    if (imageTokens.has(token)) shared += 1;
  }
  const denominator = Math.max(productTokens.size, imageTokens.size, 1);
  return shared / denominator;
}

function attachImages(products, imageRows) {
  const imageBySr = new Map(imageRows.map((row) => [row.sr, row]));
  const imagesWithData = imageRows.filter((row) => row.hasImage);

  return products.map((product) => {
    let imageRow = imageBySr.get(product.serial) ?? null;

    if (!imageRow?.hasImage) {
      let best = null;
      for (const row of imagesWithData) {
        const score = scoreImageMatch(product.shortTitle, row.name);
        if (!best || score > best.score) best = { row, score };
      }
      if (best && best.score >= 0.72) imageRow = best.row;
    }

    return {
      ...product,
      imageSourceName: imageRow?.name ?? null,
      imageMatchedBy: imageRow?.sr === product.serial ? "serial" : imageRow?.hasImage ? "title" : null,
      imageDataUrl: imageRow?.dataUrl ?? null,
      hasImage: Boolean(imageRow?.dataUrl),
    };
  });
}

function buildManifest(markdownPath, imagesHtmlPath) {
  if (!existsSync(markdownPath)) throw new Error(`Markdown file not found: ${markdownPath}`);
  if (!existsSync(imagesHtmlPath)) throw new Error(`Images HTML file not found: ${imagesHtmlPath}`);

  const products = attachImages(parseMarkdownProducts(markdownPath), parseImageRows(imagesHtmlPath));
  return {
    generatedAt: new Date().toISOString(),
    markdownPath,
    imagesHtmlPath,
    products: products.map(({ imageDataUrl, ...product }) => ({
      ...product,
      imageBytes: imageDataUrl ? Buffer.byteLength(imageDataUrl) : 0,
    })),
    summary: {
      totalProducts: products.length,
      productsWithImages: products.filter((product) => product.hasImage).length,
      productsWithoutImages: products.filter((product) => !product.hasImage).length,
      productsMissingFeatures: products.filter((product) => product.features.length === 0).length,
      productsMissingPrices: products.filter((product) => product.mrpPrice === null || product.offeredPrice === null).length,
    },
    missingImages: products.filter((product) => !product.hasImage).map((product) => `${product.serial}. ${product.shortTitle}`),
    missingFeatures: products.filter((product) => product.features.length === 0).map((product) => `${product.serial}. ${product.shortTitle}`),
    uploadProducts: products,
  };
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function writeManifest(manifest) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const jsonPath = path.join(OUTPUT_DIR, "bajwa-import-manifest.json");
  const csvPath = path.join(OUTPUT_DIR, "bajwa-import-manifest.csv");
  const summaryPath = path.join(OUTPUT_DIR, "bajwa-import-summary.txt");

  const publicManifest = { ...manifest };
  delete publicManifest.uploadProducts;

  await writeFile(jsonPath, JSON.stringify(publicManifest, null, 2));
  await writeFile(
    csvPath,
    [
      [
        "Serial",
        "Section",
        "Product Name",
        "Short Title",
        "Pack Size",
        "Reg No",
        "MRP Price",
        "Offered Price",
        "Feature Count",
        "Has Image",
        "Image Source",
        "Image Match",
      ]
        .map(csvEscape)
        .join(","),
      ...manifest.uploadProducts.map((product) =>
        [
          product.serial,
          product.section,
          product.name,
          product.shortTitle,
          product.packSize,
          product.regNo,
          product.mrpPrice,
          product.offeredPrice,
          product.features.length,
          product.hasImage,
          product.imageSourceName,
          product.imageMatchedBy,
        ]
          .map(csvEscape)
          .join(","),
      ),
    ].join("\n"),
  );
  await writeFile(
    summaryPath,
    [
      "Bajwa Pharmaceuticals import manifest",
      `Generated: ${manifest.generatedAt}`,
      `Markdown: ${manifest.markdownPath}`,
      `Images HTML: ${manifest.imagesHtmlPath}`,
      "",
      `Total products: ${manifest.summary.totalProducts}`,
      `Products with images: ${manifest.summary.productsWithImages}`,
      `Products without images: ${manifest.summary.productsWithoutImages}`,
      `Products missing features: ${manifest.summary.productsMissingFeatures}`,
      `Products missing prices: ${manifest.summary.productsMissingPrices}`,
      "",
      "Missing image products:",
      ...manifest.missingImages.map((name) => `- ${name}`),
      "",
      "Missing feature products:",
      ...manifest.missingFeatures.map((name) => `- ${name}`),
    ].join("\n"),
  );

  return { jsonPath, csvPath, summaryPath };
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

function getClient() {
  const env = { ...loadEnv(), ...process.env };
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
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
    fileSizeLimit: 1024 * 1024 * 50,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "video/quicktime"],
  });
  if (error) throw new Error(`storage bucket: ${error.message}`);
}

function decodeDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:(image\/[a-z0-9.+-]+);base64,(.*)$/i);
  if (!match) return null;
  return {
    contentType: match[1],
    bytes: Buffer.from(match[2], "base64"),
  };
}

async function uploadImage(client, product) {
  if (!product.imageDataUrl) return [];
  const decoded = decodeDataUrl(product.imageDataUrl);
  if (!decoded) return [];

  const extension = decoded.contentType.includes("png") ? "png" : decoded.contentType.includes("webp") ? "webp" : "jpg";
  const hash = createHash("sha1").update(decoded.bytes).digest("hex").slice(0, 12);
  const storagePath = `images/bajwa-pharmaceuticals/${product.slug}/01-${hash}.${extension}`;

  const { error } = await client.storage.from(BUCKET).upload(storagePath, decoded.bytes, {
    contentType: decoded.contentType,
    upsert: true,
  });
  if (error) throw new Error(`upload ${product.name}: ${error.message}`);
  const { data } = client.storage.from(BUCKET).getPublicUrl(storagePath);
  return [data.publicUrl];
}

async function uploadProducts(manifest) {
  const client = getClient();
  await ensureBucket(client);

  const mainCategory = await upsertByConflict(
    client,
    "main_categories",
    {
      name: "Pharma Products",
      slug: "pharma-products",
      description: "Medicines, injections, and pharmacy supply catalog items.",
      sort_order: 2,
    },
    "slug",
  );

  const brand = await upsertByConflict(
    client,
    "brands",
    {
      main_category_id: mainCategory.id,
      name: "Bajwa Pharmaceuticals",
      slug: "bajwa-pharmaceuticals",
      description: "Bajwa Pharmaceuticals injectable medicines and pharma catalog.",
      sort_order: 1,
    },
    "main_category_id,slug",
  );

  const subcategory = await upsertByConflict(
    client,
    "subcategories",
    {
      brand_id: brand.id,
      name: "All Products",
      slug: "all-products",
      description: "All Bajwa Pharmaceuticals products.",
      sort_order: 1,
    },
    "brand_id,slug",
  );

  const uploaded = [];

  for (const product of manifest.uploadProducts) {
    if (product.mrpPrice === null || product.offeredPrice === null) {
      throw new Error(`Missing price for ${product.name}`);
    }

    const imageUrls = await uploadImage(client, product);
    const payload = {
      main_category_id: mainCategory.id,
      brand_id: brand.id,
      subcategory_id: subcategory.id,
      second_subcategory_id: null,
      name: product.name,
      slug: product.slug,
      sku: product.regNo,
      description: product.description,
      highlights: [],
      image_urls: imageUrls,
      video_urls: [],
      mrp_price: product.mrpPrice,
      offered_price: product.offeredPrice,
      pack_size: product.packSize,
      availability: "In Stock",
      tags: ["Bajwa Pharmaceuticals", "Pharma Products", product.section, product.shortTitle, product.packSize].filter(Boolean),
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await client.from("products").upsert(payload, { onConflict: "slug" }).select("id,name").single();
    if (error) throw new Error(`products: ${product.name}: ${error.message}`);
    uploaded.push(data);
  }

  const uploadSummaryPath = path.join(OUTPUT_DIR, "bajwa-upload-summary.json");
  await writeFile(uploadSummaryPath, JSON.stringify({ uploaded }, null, 2));
  return { uploaded, uploadSummaryPath };
}

async function verifyUpload() {
  const client = getClient();
  const { data: brand, error: brandError } = await client
    .from("brands")
    .select("id,name")
    .eq("slug", "bajwa-pharmaceuticals")
    .single();
  if (brandError) throw new Error(`brands: ${brandError.message}`);

  const { data: products, error, count } = await client
    .from("products")
    .select("id,name,mrp_price,offered_price,pack_size,image_urls,description", { count: "exact" })
    .eq("brand_id", brand.id)
    .order("name");
  if (error) throw new Error(`products: ${error.message}`);

  return {
    brand,
    count,
    productsWithImages: products.filter((product) => product.image_urls?.length).length,
    productsWithoutImages: products.filter((product) => !product.image_urls?.length).length,
    productsWithDescriptions: products.filter((product) => product.description?.trim()).length,
    sample: products.slice(0, 8).map((product) => ({
      name: product.name,
      packSize: product.pack_size,
      mrp: product.mrp_price,
      offered: product.offered_price,
      images: product.image_urls?.length ?? 0,
      descriptionLines: product.description?.split(/\n/).filter(Boolean).length ?? 0,
    })),
  };
}

async function main() {
  const command = process.argv.find((arg) => arg === "--prepare" || arg === "--upload" || arg === "--verify");
  if (!command) {
    usage();
    process.exitCode = 1;
    return;
  }

  if (command === "--verify") {
    console.log(JSON.stringify(await verifyUpload(), null, 2));
    return;
  }

  const markdownPath = getArg("--markdown", DEFAULT_MARKDOWN_PATH);
  const imagesHtmlPath = getArg("--images-html", DEFAULT_IMAGES_HTML_PATH);
  const manifest = buildManifest(markdownPath, imagesHtmlPath);
  const files = await writeManifest(manifest);

  console.log(JSON.stringify({ summary: manifest.summary, missingImages: manifest.missingImages, files }, null, 2));

  if (command === "--upload") {
    const result = await uploadProducts(manifest);
    console.log(JSON.stringify({ uploaded: result.uploaded.length, file: result.uploadSummaryPath }, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
