import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, ".tmp-misc-pharma");
const BUCKET = "product-media";

const HTML_SOURCES = [
  {
    brand: "Globel Pharma",
    slug: "globel-pharma",
    sortOrder: 1,
    filePath: "C:\\Users\\ANC\\Downloads\\globel phrma.html",
  },
  {
    brand: "BSF Biosciences",
    slug: "bsf-biosciences",
    sortOrder: 2,
    filePath: "C:\\Users\\ANC\\Downloads\\bsf-biosciences-catalog.html",
  },
  {
    brand: "Organ Care and Cure Pharma",
    slug: "organ-care-and-cure-pharma",
    sortOrder: 3,
    filePath: "C:\\Users\\ANC\\Downloads\\organ_care_pharma_catalog.html",
  },
  {
    brand: "Sami Pharmaceuticals",
    slug: "sami-pharmaceuticals",
    sortOrder: 4,
    filePath: "C:\\Users\\ANC\\Downloads\\sami_pharma_catalog (1).html",
  },
  {
    brand: "Surge Laboratories",
    slug: "surge-laboratories",
    sortOrder: 5,
    filePath: "C:\\Users\\ANC\\Downloads\\surge_pharma_catalog.html",
  },
  {
    brand: "Getz Pharma",
    slug: "getz-pharma",
    sortOrder: 6,
    filePath: "C:\\Users\\ANC\\Downloads\\getz_pharma_catalog.html",
  },
  {
    brand: "Nabiqasim Industries",
    slug: "nabiqasim-industries",
    sortOrder: 7,
    filePath: "C:\\Users\\ANC\\Downloads\\nabiqasim-catalog.html",
  },
];

function usage() {
  console.log(`Usage:
  node scripts/import-misc-pharma.mjs --prepare
  node scripts/import-misc-pharma.mjs --upload
  node scripts/import-misc-pharma.mjs --verify

Optional:
  --source-dir "C:\\path\\to\\html\\files"
`);
}

function getArg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function getSources() {
  const sourceDir = getArg("--source-dir");
  if (!sourceDir) return HTML_SOURCES;

  return HTML_SOURCES.map((source) => ({
    ...source,
    filePath: path.join(sourceDir, path.basename(source.filePath)),
  }));
}

function decodeHtmlEntities(value) {
  return String(value ?? "")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&reg;/gi, "®")
    .replace(/&trade;/gi, "™")
    .replace(/&mdash;|&ndash;/gi, " - ")
    .replace(/&times;/gi, "x");
}

function cleanText(value) {
  return decodeHtmlEntities(value)
    .replace(/\uFEFF/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/Â®/g, "®")
    .replace(/Â™|â„¢/g, "™")
    .replace(/Â·/g, " - ")
    .replace(/Ã—/g, "x")
    .replace(/â€”|â€“|Ã¢â‚¬â€|Ã¢â‚¬â€œ/g, " - ")
    .replace(/â€™|Ã¢â‚¬â„¢/g, "'")
    .replace(/â€œ|â€�|Ã¢â‚¬Å“|Ã¢â‚¬ï¿½/g, '"')
    .replace(/Ã‚Â±/g, "+/-")
    .replace(/Ã‚Â°/g, " degrees ")
    .replace(/Ã‚Âµ/g, "mc")
    .replace(/Â/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value) {
  return cleanText(
    String(value ?? "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]*>/g, " "),
  );
}

function normalize(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function createSlug(value) {
  const slug = cleanText(value)
    .toLowerCase()
    .replace(/®|™/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
  return slug || "item";
}

function parsePrice(value) {
  const text = stripTags(value).replace(/,/g, "");
  if (!text || /not|n\/a|na\b|missing/i.test(text)) return null;
  const matches = text.match(/\d+(?:\.\d+)?/g);
  if (!matches?.length) return null;
  const parsed = Number(matches[matches.length - 1]);
  if (!Number.isFinite(parsed)) return null;
  return Math.round((parsed + Number.EPSILON) * 100) / 100;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractByClass(block, className) {
  const escaped = escapeRegExp(className);
  const regex = new RegExp(
    `<([a-z][\\w:-]*)\\b(?=[^>]*class\\s*=\\s*["'][^"']*(?<![\\w-])${escaped}(?![\\w-])[^"']*["'])[^>]*>([\\s\\S]*?)<\\/\\1>`,
    "gi",
  );
  return [...block.matchAll(regex)].map((match) => stripTags(match[2])).filter(Boolean);
}

function getAttribute(tag, name) {
  const regex = new RegExp(`${escapeRegExp(name)}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const match = tag.match(regex);
  return cleanText(match?.[2] ?? match?.[3] ?? match?.[4] ?? "");
}

function protectDataUrls(html) {
  const dataUrls = [];
  const safeHtml = html.replace(/data:image\/[a-z0-9.+-]+;base64,[^"'\s<>)]*/gi, (dataUrl) => {
    const token = `__AK_DATA_IMAGE_${dataUrls.length}__`;
    dataUrls.push(dataUrl);
    return token;
  });
  return { safeHtml, dataUrls };
}

function restoreImageSource(src, dataUrls) {
  const tokenMatch = src.match(/^__AK_DATA_IMAGE_(\d+)__$/);
  if (tokenMatch) return dataUrls[Number(tokenMatch[1])] ?? null;
  return src.startsWith("data:image/") ? src : null;
}

function stripScriptsAndStyles(html) {
  return html.replace(/<script\b[\s\S]*?<\/script>/gi, "").replace(/<style\b[\s\S]*?<\/style>/gi, "");
}

function findMatchingDiv(html, startIndex) {
  const tagRegex = /<\/?div\b[^>]*>/gi;
  tagRegex.lastIndex = startIndex;
  let depth = 0;

  for (let match = tagRegex.exec(html); match; match = tagRegex.exec(html)) {
    const tag = match[0];
    if (tag.startsWith("</")) {
      depth -= 1;
    } else if (!tag.endsWith("/>")) {
      depth += 1;
    }

    if (depth === 0) return html.slice(startIndex, tagRegex.lastIndex);
  }

  return html.slice(startIndex);
}

function extractCards(html) {
  const cardRegex = /<div\b(?=[^>]*class\s*=\s*["'][^"']*(?<![\w-])(?:card|product-card|catalog-card)(?![\w-])[^"']*["'])[^>]*>/gi;
  const cards = [];

  for (let match = cardRegex.exec(html); match; match = cardRegex.exec(html)) {
    const block = findMatchingDiv(html, match.index);
    if (/<img\b/i.test(block) || /class\s*=\s*["'][^"']*(?:product-name|cname|vname|price)/i.test(block)) {
      cards.push(block);
    }
  }

  return cards.length ? cards : [html];
}

function extractImages(block, dataUrls) {
  const images = [];
  const seen = new Set();
  const imgRegex = /<img\b[^>]*>/gi;

  for (const match of block.matchAll(imgRegex)) {
    const tag = match[0];
    const src = restoreImageSource(getAttribute(tag, "src"), dataUrls);
    if (!src || seen.has(src)) continue;
    seen.add(src);
    images.push({
      dataUrl: src,
      alt: cleanProductName(getAttribute(tag, "alt")),
    });
  }

  return images;
}

function cleanProductName(value) {
  const text = cleanText(value)
    .replace(/\s*\|\s*pharmaceutical price list.*$/i, "")
    .replace(/\s+-\s*pharmaceutical product catalog.*$/i, "")
    .trim();
  const englishName = text.match(/^[^\x00-\x7F].*?\(([A-Za-z][A-Za-z0-9\s+./-]+)\)\s*$/);
  return englishName ? englishName[1].trim() : text;
}

function isLikelyProductName(value) {
  const text = cleanProductName(value);
  if (!text || text.length > 160) return false;
  if (/__AK_DATA_IMAGE_|base64|pharmaceutical price list|product catalog|not printed|not clearly|download|image/i.test(text)) return false;
  return /[a-z]/i.test(text);
}

function getTexts(block, classes) {
  return classes.flatMap((className) => extractByClass(block, className).map(cleanText)).filter(Boolean);
}

function getNames(block, images) {
  const names = getTexts(block, ["product-name", "cname", "vname"])
    .map(cleanProductName)
    .filter(isLikelyProductName);
  const altNames = images.map((image) => image.alt).filter(isLikelyProductName);
  return names.length ? names : altNames;
}

function getGenerics(block) {
  return getTexts(block, ["generic-name", "cgen", "vgen", "generic", "composition"])
    .map((text) => text.replace(/^(generic|composition)\s*:\s*/i, ""))
    .filter((text) => text && !/not printed|not clearly/i.test(text));
}

function getStrengths(block) {
  return getTexts(block, ["cstr", "vstr", "dose-pill", "strength", "pack", "pack-size"])
    .map((text) => text.replace(/^(strength|pack|dose)\s*:\s*/i, ""))
    .filter((text) => text && !/not printed|not clearly/i.test(text));
}

function getPrices(block) {
  const priceTexts = extractByClass(block, "price");
  return priceTexts.map(parsePrice).filter((price) => price !== null);
}

function selectImages(images, index, count) {
  if (images.length === 0) return [];
  if (count > 1 && images.length >= count) return [images[index]?.dataUrl ?? images[0].dataUrl].filter(Boolean);
  return images.map((image) => image.dataUrl).filter(Boolean);
}

function firstAvailable(values, index) {
  return cleanText(values[index] ?? values[0] ?? "");
}

function buildPackSize(generic, strength) {
  const parts = [generic, strength].map(cleanText).filter(Boolean);
  return [...new Set(parts)].join(" | ") || null;
}

function buildProductName(name, strength) {
  const cleanName = cleanProductName(name);
  const cleanStrength = cleanText(strength);
  const base = cleanName.replace(/\s+\d+\s*mg\s+and\s+\d+\s*mg\s*$/i, "").trim();
  if (base && base !== cleanName && /\b\d+\s*mg\b/i.test(cleanStrength)) {
    return `${base} ${cleanStrength}`.trim();
  }
  return cleanName;
}

function inferForm(product) {
  const text = normalize(`${product.name} ${product.generic ?? ""} ${product.strength ?? ""}`);
  if (/\b(injection|inj|iv|ampoule|vial|infusion|syringe)\b/.test(text)) return "Injectable/IV catalog product";
  if (/\b(tablet|tab)\b/.test(text)) return "Tablet catalog product";
  if (/\b(capsule|cap)\b/.test(text)) return "Capsule catalog product";
  if (/\b(syrup|suspension)\b/.test(text)) return "Liquid oral catalog product";
  if (/\b(enema)\b/.test(text)) return "Enema catalog product";
  if (/\b(drop|drops)\b/.test(text)) return "Drops catalog product";
  return "Pharmaceutical catalog product";
}

function buildFeatures(product) {
  const packDetail = buildPackSize(product.generic, product.strength);
  const identity = packDetail
    ? `Composition/pack detail captured from source catalog: ${packDetail}.`
    : "Product identity captured from the source catalog title.";

  return [
    `${inferForm(product)} listed under ${product.brand}.`,
    identity,
    product.imageDataUrls.length
      ? "Packaging image uploaded for quick visual identification in the catalog."
      : "MRP captured from source catalog for quick price reference.",
  ];
}

function uniqueBySlug(products) {
  const counts = new Map();
  return products.map((product) => {
    const count = (counts.get(product.slug) ?? 0) + 1;
    counts.set(product.slug, count);
    if (count === 1) return product;
    return { ...product, slug: `${product.slug}-${count}` };
  });
}

function parseSource(source, sourceIndex) {
  if (!existsSync(source.filePath)) throw new Error(`HTML file not found: ${source.filePath}`);

  const rawHtml = readFileSync(source.filePath, "utf8");
  const { safeHtml, dataUrls } = protectDataUrls(rawHtml);
  const html = stripScriptsAndStyles(safeHtml);
  const cards = extractCards(html);
  const products = [];
  const skipped = [];

  cards.forEach((card, cardIndex) => {
    const images = extractImages(card, dataUrls);
    const names = getNames(card, images);
    const generics = getGenerics(card);
    const strengths = getStrengths(card);
    const prices = getPrices(card);
    const entryCount = Math.max(names.length, prices.length);

    if (entryCount === 0) return;

    for (let entryIndex = 0; entryIndex < entryCount; entryIndex += 1) {
      const mrpPrice = prices[entryIndex] ?? (prices.length === 1 ? prices[0] : null);
      const generic = firstAvailable(generics, entryIndex);
      const strength = firstAvailable(strengths, entryIndex);
      const name = buildProductName(firstAvailable(names, entryIndex), strength);

      if (!isLikelyProductName(name)) {
        skipped.push({
          brand: source.brand,
          reason: "missing-product-name",
          card: cardIndex + 1,
          price: mrpPrice,
        });
        continue;
      }

      if (mrpPrice === null) {
        skipped.push({
          brand: source.brand,
          reason: "missing-mrp",
          card: cardIndex + 1,
          name,
        });
        continue;
      }

      const imageDataUrls = selectImages(images, entryIndex, entryCount);
      const product = {
        sourceFile: source.filePath,
        sourceBrandSlug: source.slug,
        brand: source.brand,
        brandSortOrder: source.sortOrder,
        serial: products.length + 1,
        name,
        generic,
        strength,
        packSize: buildPackSize(generic, strength),
        mrpPrice,
        offeredPrice: null,
        imageDataUrls,
        hasImage: imageDataUrls.length > 0,
        slug: `misc-${source.slug}-${createSlug(name)}-${createSlug(strength || generic)}-${sourceIndex + 1}-${products.length + 1}`,
      };
      const features = buildFeatures(product);
      products.push({
        ...product,
        features,
        description: features.map((feature) => `\u2022 ${feature}`).join("\n"),
      });
    }
  });

  return { products: uniqueBySlug(products), skipped };
}

function buildManifest() {
  const sources = getSources();
  const parsed = sources.map(parseSource);
  const uploadProducts = parsed.flatMap((item) => item.products);
  const skippedProducts = parsed.flatMap((item) => item.skipped);
  const byBrand = sources.map((source) => {
    const products = uploadProducts.filter((product) => product.sourceBrandSlug === source.slug);
    return {
      brand: source.brand,
      sourceFile: source.filePath,
      totalProducts: products.length,
      productsWithImages: products.filter((product) => product.hasImage).length,
      productsWithoutImages: products.filter((product) => !product.hasImage).length,
      skipped: skippedProducts.filter((item) => item.brand === source.brand).length,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    mainCategory: "Miscellaneous Pharma",
    sources: sources.map((source) => ({ brand: source.brand, filePath: source.filePath })),
    products: uploadProducts.map((product) => ({
      ...product,
      imageDataUrls: undefined,
      imageCount: product.imageDataUrls.length,
      imageBytes: product.imageDataUrls.map((dataUrl) => Buffer.byteLength(dataUrl)),
    })),
    uploadProducts,
    skippedProducts,
    summary: {
      totalProducts: uploadProducts.length,
      productsWithImages: uploadProducts.filter((product) => product.hasImage).length,
      productsWithoutImages: uploadProducts.filter((product) => !product.hasImage).length,
      productsWithDescriptions: uploadProducts.filter((product) => product.description.trim()).length,
      productsWithOfferedPrice: uploadProducts.filter((product) => product.offeredPrice !== null).length,
      skippedProducts: skippedProducts.length,
      byBrand,
    },
  };
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function writeManifest(manifest) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const jsonPath = path.join(OUTPUT_DIR, "misc-pharma-import-manifest.json");
  const csvPath = path.join(OUTPUT_DIR, "misc-pharma-import-manifest.csv");
  const summaryPath = path.join(OUTPUT_DIR, "misc-pharma-import-summary.txt");

  const publicManifest = { ...manifest };
  delete publicManifest.uploadProducts;

  await writeFile(jsonPath, JSON.stringify(publicManifest, null, 2));
  await writeFile(
    csvPath,
    [
      [
        "Brand",
        "Product Name",
        "Generic",
        "Strength",
        "MRP Price",
        "Offered Price",
        "Image Count",
        "Description Lines",
        "Slug",
      ]
        .map(csvEscape)
        .join(","),
      ...manifest.uploadProducts.map((product) =>
        [
          product.brand,
          product.name,
          product.generic,
          product.strength,
          product.mrpPrice,
          product.offeredPrice,
          product.imageDataUrls.length,
          product.description.split(/\n/).filter(Boolean).length,
          product.slug,
        ]
          .map(csvEscape)
          .join(","),
      ),
    ].join("\n"),
  );
  await writeFile(
    summaryPath,
    [
      "Miscellaneous Pharma import manifest",
      `Generated: ${manifest.generatedAt}`,
      "",
      `Total products: ${manifest.summary.totalProducts}`,
      `Products with images: ${manifest.summary.productsWithImages}`,
      `Products without images: ${manifest.summary.productsWithoutImages}`,
      `Products with descriptions: ${manifest.summary.productsWithDescriptions}`,
      `Products with offered price: ${manifest.summary.productsWithOfferedPrice}`,
      `Skipped products: ${manifest.summary.skippedProducts}`,
      "",
      "By brand:",
      ...manifest.summary.byBrand.map(
        (brand) =>
          `- ${brand.brand}: ${brand.totalProducts} products, ${brand.productsWithImages} with images, ${brand.skipped} skipped`,
      ),
      "",
      "Skipped source rows:",
      ...manifest.skippedProducts.map((item) => `- ${item.brand}: ${item.reason}${item.name ? ` - ${item.name}` : ""}`),
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

async function uploadImages(client, product) {
  const urls = [];

  for (let index = 0; index < product.imageDataUrls.length; index += 1) {
    const dataUrl = product.imageDataUrls[index];
    const decoded = decodeDataUrl(dataUrl);
    if (!decoded) continue;

    const extension = decoded.contentType.includes("png") ? "png" : decoded.contentType.includes("webp") ? "webp" : "jpg";
    const hash = createHash("sha1").update(decoded.bytes).digest("hex").slice(0, 12);
    const storagePath = `images/miscellaneous-pharma/${product.sourceBrandSlug}/${product.slug}/${String(index + 1).padStart(2, "0")}-${hash}.${extension}`;

    const { error } = await client.storage.from(BUCKET).upload(storagePath, decoded.bytes, {
      contentType: decoded.contentType,
      upsert: true,
    });
    if (error) throw new Error(`upload ${product.name}: ${error.message}`);
    const { data } = client.storage.from(BUCKET).getPublicUrl(storagePath);
    urls.push(data.publicUrl);
  }

  return urls;
}

async function uploadProducts(manifest) {
  const client = getClient();
  await ensureBucket(client);

  const mainCategory = await upsertByConflict(
    client,
    "main_categories",
    {
      name: "Miscellaneous Pharma",
      slug: "miscellaneous-pharma",
      description: "Miscellaneous pharmaceutical products listed directly by brand.",
      sort_order: 3,
    },
    "slug",
  );

  const brandCache = new Map();
  const subcategoryCache = new Map();
  const uploaded = [];

  for (const product of manifest.uploadProducts) {
    let brand = brandCache.get(product.sourceBrandSlug);
    if (!brand) {
      brand = await upsertByConflict(
        client,
        "brands",
        {
          main_category_id: mainCategory.id,
          name: product.brand,
          slug: product.sourceBrandSlug,
          description: `${product.brand} miscellaneous pharmaceutical catalog products.`,
          sort_order: product.brandSortOrder,
        },
        "main_category_id,slug",
      );
      brandCache.set(product.sourceBrandSlug, brand);
    }

    let subcategory = subcategoryCache.get(product.sourceBrandSlug);
    if (!subcategory) {
      subcategory = await upsertByConflict(
        client,
        "subcategories",
        {
          brand_id: brand.id,
          name: "All Products",
          slug: "all-products",
          description: `All ${product.brand} miscellaneous pharma products.`,
          sort_order: 1,
        },
        "brand_id,slug",
      );
      subcategoryCache.set(product.sourceBrandSlug, subcategory);
    }

    const imageUrls = await uploadImages(client, product);
    const payload = {
      main_category_id: mainCategory.id,
      brand_id: brand.id,
      subcategory_id: subcategory.id,
      second_subcategory_id: null,
      name: product.name,
      slug: product.slug,
      sku: null,
      description: product.description,
      highlights: [],
      image_urls: imageUrls,
      video_urls: [],
      mrp_price: product.mrpPrice,
      offered_price: null,
      pack_size: product.packSize,
      availability: "In Stock",
      tags: ["Miscellaneous Pharma", product.brand, product.generic, product.strength, product.name].filter(Boolean),
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await client.from("products").upsert(payload, { onConflict: "slug" }).select("id,name").single();
    if (error) throw new Error(`products: ${product.name}: ${error.message}`);
    uploaded.push({ ...data, brand: product.brand });
  }

  const uploadSummaryPath = path.join(OUTPUT_DIR, "misc-pharma-upload-summary.json");
  await writeFile(uploadSummaryPath, JSON.stringify({ uploaded }, null, 2));
  return { uploaded, uploadSummaryPath };
}

async function verifyUpload() {
  const client = getClient();
  const { data: category, error: categoryError } = await client
    .from("main_categories")
    .select("id,name")
    .eq("slug", "miscellaneous-pharma")
    .single();
  if (categoryError) throw new Error(`main_categories: ${categoryError.message}`);

  const { data: brands, error: brandsError } = await client
    .from("brands")
    .select("id,name,slug")
    .eq("main_category_id", category.id)
    .order("sort_order");
  if (brandsError) throw new Error(`brands: ${brandsError.message}`);

  const { data: products, error, count } = await client
    .from("products")
    .select("id,name,mrp_price,offered_price,image_urls,description,brand_id", { count: "exact" })
    .eq("main_category_id", category.id)
    .order("name");
  if (error) throw new Error(`products: ${error.message}`);

  return {
    category,
    brandCount: brands.length,
    count,
    productsWithImages: products.filter((product) => product.image_urls?.length).length,
    productsWithoutImages: products.filter((product) => !product.image_urls?.length).length,
    productsWithDescriptions: products.filter((product) => product.description?.trim()).length,
    productsWithOfferedPrice: products.filter((product) => product.offered_price !== null).length,
    byBrand: brands.map((brand) => {
      const brandProducts = products.filter((product) => product.brand_id === brand.id);
      return {
        brand: brand.name,
        count: brandProducts.length,
        images: brandProducts.filter((product) => product.image_urls?.length).length,
      };
    }),
    sample: products.slice(0, 12).map((product) => ({
      name: product.name,
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

  const manifest = buildManifest();
  const files = await writeManifest(manifest);

  console.log(
    JSON.stringify(
      {
        summary: manifest.summary,
        skippedProducts: manifest.skippedProducts,
        files,
      },
      null,
      2,
    ),
  );

  if (command === "--upload") {
    const result = await uploadProducts(manifest);
    console.log(JSON.stringify({ uploaded: result.uploaded.length, file: result.uploadSummaryPath }, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
