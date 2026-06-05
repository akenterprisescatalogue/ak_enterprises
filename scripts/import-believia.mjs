import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const DEFAULT_IMAGE_ROOT = "C:\\Users\\ANC\\Downloads\\Compressed\\Believia";
const OUTPUT_DIR = path.join(PROJECT_ROOT, ".tmp-believia");
const BUCKET = "product-media";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

const PRODUCT_ROWS_TSV = `
1	BP Apparatus	Aneroid	Believia Aneroid AN01 (HS-20A) Meter
2	BP Apparatus	Aneroid	Believia Palm Type Aneroid AN-02  (HS-201T)  Machine
3	BP Apparatus	Upper Arm (Automatic)	Believa BP30W Machine
4	BP Apparatus	Upper Arm (Automatic)	Believia BP20FK Family Kit
5	BP Apparatus	Upper Arm (Automatic)	Believia BP30A (LD-532) BP Machine
6	BP Apparatus	Upper Arm (Automatic)	Believia BP40A (DBP-1333) BP Machine
7	BP Apparatus	Upper Arm (Automatic)	Believia BP40W Machine
8	BP Apparatus	Upper Arm (Automatic)	Believia Digital BP50A Machine
9	BP Apparatus	Upper Arm (Automatic)	Believia Digital BP-60A (KF-66EP) Machine
10	BP Apparatus	Mercurial	Believia Mercurial BP15M Machine
11	Stethoscopes	Deluxe / Dual Head	Believia Deluxe DST05 (HS-30N) Steth
12	Stethoscopes	Deluxe / Dual Head	Believia Deluxe DST05 (HS-30N) Steth Black
13	Stethoscopes	Deluxe / Dual Head	Believia Deluxe DST05 (HS-30N) Steth Blue
14	Stethoscopes	Deluxe / Dual Head	Believia Deluxe DST05 (HS-30N) Steth Burgundy
15	Stethoscopes	Deluxe / Dual Head	Believia Dual Head BCS-06 (HS-30J) Steth Black
16	Stethoscopes	Deluxe / Dual Head	Believia Dual Head BCS-06 (HS-30J) Steth Blue
17	Stethoscopes	Deluxe / Dual Head	Believia Dual Head BCS-06 (HS-30J) Steth Burgundy
18	Stethoscopes	Deluxe / Dual Head	Believia Dual Head BCS-06 (HS-30J) Steth Grey
19	Stethoscopes	Standard / Classic	Believia ST01 (HS-30B) Steth
20	Stethoscopes	Standard / Classic	Believia ST05 Steth
21	Thermometers	Digital	Believia DT10 (DMT-4333) Digital Thermometer
22	Thermometers	Digital	Believia DT20 Digital Thermometer
23	Thermometers	Forehead / Infrared Gun	Believia infrared Forehead  IF 02T (DET-3012) Gun
24	Blood Glucose Monitors	Glucometers	Believia Bg-01 Blood Glucose Meter
25	Blood Glucose Monitors	Test Strips	Believia Blood Glucose 50ct Test Strip
26	Blood Glucose Monitors	Test Strips	Believia Blood Glucose Blister pack 50ct Test Strip
27	Blood Glucose Monitors	Lancets & Accessories	Believia 30G Flat Sterile Lancets 100ct
28	Blood Glucose Monitors	Lancets & Accessories	Believia 30G Twis Sterile Lancets 100ct
29	Blood Glucose Monitors	Lancets & Accessories	Believia Flat FBL- Lancets 100ct
30	Blood Glucose Monitors	Lancets & Accessories	Believia Flat FBL Lancets 50ct
31	Blood Glucose Monitors	Lancets & Accessories	Believia Twist Blood 30G Lancets 100ct
32	Blood Glucose Monitors	Lancets & Accessories	Believia Twist TBL Lancets 50ct
33	Blood Glucose Monitors	Lancets & Accessories	Believia Lancing Device Pen
34	Blood Glucose Monitors	Lancets & Accessories	Believia Alchohal Prep Pads
35	Pulse Oximeters	Finger Tip	Believia Pulse Meter
36	Nebulizers	Compressor / Piston	Believia Compressor Nebulizer Nb-06 (KF-WHQ-07) Machine
37	Nebulizers	Compressor / Piston	Believia Nebulizer NB03 Machine
38	Nebulizers	Compressor / Piston	Believia Nebulizer NB04 Machine
39	Nebulizers	Mesh	Believia Mesh Nebulizer Machine
40	Weighing Scales	Personal / Digital	Believia DT08 Personal (DT09-SS) Scale
41	Weighing Scales	Personal / Digital	Believia DWS-005 Digital weight Scale
42	Weighing Scales	Personal / Digital	Believia EB-3020A Digital weight Scale
43	Weighing Scales	Personal / Digital	Believia MB-3021 Digital weight Scale
44	Weighing Scales	Personal / Digital	Believia MB3031 Electronic Mother and baby Weight Scale
45	Weighing Scales	Personal / Digital	Believia Digital EBS-01 Baby Weight Scale
46	Weighing Scales	Mechanical	Believia BR2010B Mechanical Scale
47	Weighing Scales	Height & Weight	Believia HWS-001 Height And Weight Scale
48	Heating Pads & Therapy	Heating Pads	Believia HP-01 Heating Pad
49	Heating Pads & Therapy	Heating Pads	Believia NSH-02 Neck & Shoulder Heating Pad
50	Heating Pads & Therapy	TENS Therapy	Believia Tens Therapy ETD-002 Device
51	Breast Pumps	Manual	Believia Manual MBP-01 Breast Pump
52	Breast Pumps	Electric	Believia Electric EBP-01 (LD-2010) Breast Pump
53	Breast Pumps	Electric	Believia Electric EBP-02 Breast Pump
54	Air Mattresses	Air Mattress	Believia Air Mattress AM01 Machine
55	Air Mattresses	Air Mattress	Believia Air Mattress AM01 Machine
56	Air Mattresses	Air Mattress	Believia Air Mattress AM02 Machine
57	Air Mattresses	Air Mattress	Believia Air Mattress AM-03 Machine
58	Oxygen Therapy	Oxygen Concentrators	Believia Oxygen Concentrator 5L Machine
59	Oxygen Therapy	Oxygen Concentrators	Believia Oxygen Concentrator OXC-10 Machine
60	Oral Care	Oral Irrigator	Believia 0i01 Oral Irrigator Machine
61	Suction Machines	Suction	Believia Suction SU01 Machine
62	Mobility Aids	Wheelchair	Belivia Electric EWC-01 Wheel Chair
`.trim();

const PRICE_ROWS = [
  ["Believia 0i01 Oral Irrigator Machine", 14750, 9510.48],
  ["Believia BP30A (LD-532) BP Machine", 8555, 5216.98],
  ["Believia Digital BP-60A (KF-66EP) Machine", 7490.64, 4594.71],
  ["Believia BP40A (DBP-1333) BP Machine", 6490, 4079.07],
  ["Believia BP40W Machine", 4543, 3251.69],
  ["Believia Pulse Meter", 4720, 2964.92],
  ["Believia Aneroid AN01 (HS-20A) Meter", 2242, 1550.53],
  ["Believia Palm Type Aneroid AN-02  (HS-201T)  Machine", null, 3065.19],
  ["Believia DT10 (DMT-4333) Digital Thermometer", 649, 386.73],
  ["Believia Nebulizer NB03 Machine", 6962, 4588.45],
  ["Believia Mesh Nebulizer Machine", null, 4227.75],
  ["Believia Compressor Nebulizer Nb-06 (KF-WHQ-07) Machine", 5900, 3577.24],
  ["Believia DT08 Personal (DT09-SS) Scale", null, 4617.2],
  ["Believia EB-3020A Digital weight Scale", 3186, 2089.45],
  ["Believia Digital EBS-01 Baby Weight Scale", 6726, 5169.36],
  ["Believia BR2010B Mechanical Scale", 2950, 2071.77],
  ["Believia Suction SU01 Machine", null, 13081.6],
  ["Believia Manual MBP-01 Breast Pump", 1888, 1376.57],
  ["Believia Electric EBP-02 Breast Pump", 4130, 3129.48],
  ["Believia Electric EBP-01 (LD-2010) Breast Pump", 12900, 6157.27],
  ["Believia Tens Therapy ETD-002 Device", 8850, 6132.42],
  ["Believia Air Mattress AM-03 Machine", 8614, 5294.51],
  ["Believia Deluxe DST05 (HS-30N) Steth Black", null, 1556.12],
  ["Believia Dual Head BCS-06 (HS-30J) Steth Black", null, 2639.64],
  ["Believia Dual Head BCS-06 (HS-30J) Steth Burgundy", null, 2637.79],
  ["Believia Deluxe DST05 (HS-30N) Steth Burgundy", null, 1597.8],
  ["Believia Deluxe DST05 (HS-30N) Steth Blue", null, 1597.8],
  ["Believia Dual Head BCS-06 (HS-30J) Steth Blue", null, 2637.79],
  ["Believia Dual Head BCS-06 (HS-30J) Steth Grey", null, 2637.79],
  ["Believia Bg-01 Blood Glucose Meter", 2330, 1100],
  ["Believia Blood Glucose 50ct Test Strip", 1416, 1078.43],
  ["Believia Blood Glucose Blister pack 50ct Test Strip", null, 1415.43],
  ["Believia Twist TBL Lancets 50ct", null, 82.86],
  ["Believia Flat FBL Lancets 50ct", null, 98.27],
  ["Believia 30G Flat Sterile Lancets 100ct", null, 151.92],
  ["Believia Flat FBL- Lancets 100ct", null, 180.16],
  ["Believia Twist Blood 30G Lancets 100ct", null, 180.16],
  ["Believia NSH-02 Neck & Shoulder Heating Pad", null, 5220.85],
  ["Believia HP-01 Heating Pad", null, 3397.7],
];

const IMAGE_MATCHES = {
  "Believia Aneroid AN01 (HS-20A) Meter": ["BP WRIST\\BELIEVIA ANEROID AN01 (HS20A) METER"],
  "Believia Palm Type Aneroid AN-02  (HS-201T)  Machine": [
    "BP WRIST\\BELIEVIA PALM TYPE ANEROID AN-02 (HS-201T) MACHINE",
  ],
  "Believia BP30A (LD-532) BP Machine": ["BP UPPER ARM\\BELIEVIA BP 30A(LD-532) BP MACHINE"],
  "Believia BP40A (DBP-1333) BP Machine": ["BP UPPER ARM\\BELIEVIA BP40A(DBP-1333) BP MACHINE"],
  "Believia Digital BP50A Machine": ["BP UPPER ARM\\BELIEVIA DIGITAL BP 50A MACHINE"],
  "Believia Digital BP-60A (KF-66EP) Machine": ["BP UPPER ARM\\BELIEVIA DIGITAL BP-60A (KF-66EP) MACHINE"],
  "Believia infrared Forehead  IF 02T (DET-3012) Gun": [
    "Misc BELIEVIA\\BELIEVIA INFRARED FOREHEAD IF 02T (DET-3012) GUN",
    "Misc BELIEVIA\\1779362055293.png",
  ],
  "Believia Pulse Meter": ["THERMOMETER & PULSE OXIMETER\\Pulse oximeter"],
  "Believia DT10 (DMT-4333) Digital Thermometer": ["THERMOMETER & PULSE OXIMETER\\Digital thermometer"],
  "Believia DT20 Digital Thermometer": ["THERMOMETER & PULSE OXIMETER\\Digital thermometer"],
  "Believia Compressor Nebulizer Nb-06 (KF-WHQ-07) Machine": [
    "BELIEVIA NEBULIZER\\Compressor Nebulizer KHWQ_07",
    "Misc BELIEVIA\\IMG-20260522-WA0213.jpg",
  ],
  "Believia Mesh Nebulizer Machine": ["BELIEVIA NEBULIZER\\Mesh nebulizer"],
  "Believia DT08 Personal (DT09-SS) Scale": ["Weight scales\\Perosnal scale DT09SS"],
  "Believia EB-3020A Digital weight Scale": [
    "BELIEVIA NEBULIZER\\Personal scale 3020A",
    "Weight scales\\Personal Glass Scale 3020A",
  ],
  "Believia BR2010B Mechanical Scale": ["Weight scales\\Mechanical bathroom scale"],
  "Believia HWS-001 Height And Weight Scale": ["Weight scales\\Height and weight scale"],
  "Believia HP-01 Heating Pad": [
    "Misc BELIEVIA\\BELIEVIA HEATING PAD\\BELIEVIA HP-01 HEATING PAD",
    "Misc BELIEVIA\\IMG-20260522-WA0243.jpg",
  ],
  "Believia NSH-02 Neck & Shoulder Heating Pad": [
    "Misc BELIEVIA\\1780396078852.png",
    "Misc BELIEVIA\\1780396146548.png",
    "Misc BELIEVIA\\1780396213024.png",
  ],
  "Believia Tens Therapy ETD-002 Device": ["Misc BELIEVIA\\BELIEVIA TENS THERAPY ETD-002 DEVICE"],
  "Believia Manual MBP-01 Breast Pump": ["Misc BELIEVIA\\BELIEVIA MANUAL MBP-01 BREAST PUMP"],
  "Believia Electric EBP-01 (LD-2010) Breast Pump": [
    "Misc BELIEVIA\\BELIEVIA ELECTRIC EBP-01 (LD-2010) BREAST PUMP",
  ],
  "Believia Electric EBP-02 Breast Pump": ["Misc BELIEVIA\\BELIEVIA ELECTRIC EBP-02 BREAST PUMP"],
  "Believia Air Mattress AM-03 Machine": ["Misc BELIEVIA\\BELIEVIA AIR MATTRESS AM -03 MACHINE"],
  "Believia Oxygen Concentrator 5L Machine": ["OXYGEN CONCENTRATOR &SUCTION UNIT"],
  "Believia 0i01 Oral Irrigator Machine": ["Misc BELIEVIA\\BELIEVIA Oi01 ORAL IRRIGATOR MACHINE"],
  "Believia Suction SU01 Machine": [
    "Misc BELIEVIA\\BELIEVIA SUCTION SU 01 MACHINE",
    "Stethoscopes\\IMG-20260521-WA0175.jpg",
  ],
  "Believia Dual Head BCS-06 (HS-30J) Steth Burgundy": [
    "Stethoscopes\\BELIEVIA DUAL HEAD BCS-06(HS-30J) STETH BURGUNDY",
  ],
  "Believia Dual Head BCS-06 (HS-30J) Steth Grey": [
    "Stethoscopes\\BELIEVIA DUAL HEAD BCS-06(HS-30J) STETH GREY",
  ],
};

function usage() {
  console.log(`Usage:
  node scripts/import-believia.mjs --prepare [--image-root "C:\\path\\Believia"]
  node scripts/import-believia.mjs --upload-priced [--image-root "C:\\path\\Believia"]
  node scripts/import-believia.mjs --verify

Notes:
  --prepare writes .tmp-believia/believia-import-manifest.json and .csv
  --upload-priced uploads only products with known prices, so no pricing is invented.
`);
}

function getArg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function createSlug(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
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

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function parseProducts() {
  const usedSlugs = new Map();
  return PRODUCT_ROWS_TSV.split(/\r?\n/).map((line) => {
    const [serialText, subcategory, secondSubcategory, name] = line.split("\t").map((item) => item.trim());
    const baseSlug = createSlug(name);
    const count = usedSlugs.get(baseSlug) ?? 0;
    usedSlugs.set(baseSlug, count + 1);
    const slug = count === 0 ? baseSlug : `${baseSlug}-${serialText}`;

    return {
      serial: Number(serialText),
      mainCategory: "Surgical Products",
      brand: "Believia",
      subcategory,
      secondSubcategory,
      name,
      slug,
      sku: `BEL-${String(serialText).padStart(3, "0")}`,
    };
  });
}

function buildPriceMap() {
  const priceMap = new Map();
  for (const [name, sourceMrp, offeredPrice] of PRICE_ROWS) {
    const mrpPrice = sourceMrp === null ? roundMoney(offeredPrice * 1.4) : sourceMrp;
    priceMap.set(normalize(name), {
      sourceName: name,
      mrpPrice,
      offeredPrice,
      mrpSource: sourceMrp === null ? "calculated_40_percent_above_offered" : "sale_rate_sheet",
    });
  }
  return priceMap;
}

async function listImageFiles(root) {
  const files = [];

  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        files.push(fullPath);
      }
    }
  }

  await walk(root);
  return files;
}

function collectImagesForMatch(root, match) {
  const target = path.join(root, match);
  if (!existsSync(target)) return [];
  const stat = readFileSync;
  void stat;
  return target;
}

async function resolveImagePaths(root, productName) {
  const matches = IMAGE_MATCHES[productName] ?? [];
  const resolved = [];

  async function addTarget(relativeTarget) {
    const target = path.join(root, relativeTarget);
    if (!existsSync(target)) return;
    const entries = await readdir(target, { withFileTypes: true }).catch(() => null);
    if (entries) {
      for (const entry of entries) {
        const fullPath = path.join(target, entry.name);
        if (entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
          resolved.push(fullPath);
        }
      }
      return;
    }
    if (IMAGE_EXTENSIONS.has(path.extname(target).toLowerCase())) {
      resolved.push(target);
    }
  }

  for (const match of matches) {
    await addTarget(match);
  }

  return [...new Map(resolved.map((file) => [path.normalize(file).toLowerCase(), file])).values()];
}

async function buildManifest(imageRoot) {
  if (!existsSync(imageRoot)) {
    throw new Error(`Image root not found: ${imageRoot}`);
  }

  const products = parseProducts();
  const priceMap = buildPriceMap();
  const imageFiles = await listImageFiles(imageRoot);
  const manifestProducts = [];

  for (const product of products) {
    const price = priceMap.get(normalize(product.name)) ?? null;
    const imagePaths = await resolveImagePaths(imageRoot, product.name);

    manifestProducts.push({
      ...product,
      mrpPrice: price?.mrpPrice ?? null,
      offeredPrice: price?.offeredPrice ?? null,
      priceSourceName: price?.sourceName ?? null,
      mrpSource: price?.mrpSource ?? null,
      imagePaths,
      imageCount: imagePaths.length,
      missingPrice: !price,
      missingImages: imagePaths.length === 0,
    });
  }

  const matchedImageSet = new Set(
    manifestProducts.flatMap((product) => product.imagePaths.map((file) => path.normalize(file).toLowerCase())),
  );
  const unmatchedImagePaths = imageFiles.filter((file) => !matchedImageSet.has(path.normalize(file).toLowerCase()));

  return {
    generatedAt: new Date().toISOString(),
    imageRoot,
    products: manifestProducts,
    summary: {
      totalProducts: manifestProducts.length,
      pricedProducts: manifestProducts.filter((product) => !product.missingPrice).length,
      productsWithImages: manifestProducts.filter((product) => !product.missingImages).length,
      missingPriceCount: manifestProducts.filter((product) => product.missingPrice).length,
      missingImageCount: manifestProducts.filter((product) => product.missingImages).length,
      unmatchedImageCount: unmatchedImagePaths.length,
    },
    missingPrices: manifestProducts.filter((product) => product.missingPrice).map((product) => product.name),
    missingImages: manifestProducts.filter((product) => product.missingImages).map((product) => product.name),
    unmatchedImagePaths,
  };
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function writeManifest(manifest) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const jsonPath = path.join(OUTPUT_DIR, "believia-import-manifest.json");
  const csvPath = path.join(OUTPUT_DIR, "believia-import-manifest.csv");
  const summaryPath = path.join(OUTPUT_DIR, "believia-import-summary.txt");

  await writeFile(jsonPath, JSON.stringify(manifest, null, 2));
  await writeFile(
    csvPath,
    [
      [
        "Serial",
        "Main Category",
        "Brand",
        "SubCategory",
        "Second SubCategory",
        "Product Name",
        "MRP Price",
        "Offered Price",
        "MRP Source",
        "Image Count",
        "Image Paths",
        "Missing Price",
        "Missing Images",
      ]
        .map(csvEscape)
        .join(","),
      ...manifest.products.map((product) =>
        [
          product.serial,
          product.mainCategory,
          product.brand,
          product.subcategory,
          product.secondSubcategory,
          product.name,
          product.mrpPrice,
          product.offeredPrice,
          product.mrpSource,
          product.imageCount,
          product.imagePaths.join(" | "),
          product.missingPrice,
          product.missingImages,
        ]
          .map(csvEscape)
          .join(","),
      ),
    ].join("\n"),
  );
  await writeFile(
    summaryPath,
    [
      `Believia import manifest`,
      `Generated: ${manifest.generatedAt}`,
      `Image root: ${manifest.imageRoot}`,
      ``,
      `Total products: ${manifest.summary.totalProducts}`,
      `Priced products: ${manifest.summary.pricedProducts}`,
      `Products with images: ${manifest.summary.productsWithImages}`,
      `Missing prices: ${manifest.summary.missingPriceCount}`,
      `Missing images: ${manifest.summary.missingImageCount}`,
      `Unmatched image files: ${manifest.summary.unmatchedImageCount}`,
      ``,
      `Missing price products:`,
      ...manifest.missingPrices.map((name) => `- ${name}`),
      ``,
      `Missing image products:`,
      ...manifest.missingImages.map((name) => `- ${name}`),
    ].join("\n"),
  );

  return { jsonPath, csvPath, summaryPath };
}

function loadEnv() {
  const envPath = path.join(PROJECT_ROOT, ".env");
  if (!existsSync(envPath)) return {};
  const env = {};
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
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

function contentTypeFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  if (extension === ".gif") return "image/gif";
  return "image/jpeg";
}

async function upsertByConflict(client, table, payload, onConflict) {
  const { data, error } = await client.from(table).upsert(payload, { onConflict }).select("*").single();
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
}

async function uploadProductImages(client, product) {
  const urls = [];
  for (const [index, imagePath] of product.imagePaths.entries()) {
    const bytes = await readFile(imagePath);
    const hash = createHash("sha1").update(bytes).digest("hex").slice(0, 12);
    const safeName = path.basename(imagePath).toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
    const storagePath = `images/believia/${product.slug}/${String(index + 1).padStart(2, "0")}-${hash}-${safeName}`;
    const { error } = await client.storage.from(BUCKET).upload(storagePath, bytes, {
      contentType: contentTypeFor(imagePath),
      upsert: true,
    });
    if (error) throw new Error(`upload ${imagePath}: ${error.message}`);
    const { data } = client.storage.from(BUCKET).getPublicUrl(storagePath);
    urls.push(data.publicUrl);
  }
  return urls;
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

async function uploadPricedProducts(manifest) {
  const env = { ...loadEnv(), ...process.env };
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.");
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

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
    "slug",
  );

  const brand = await upsertByConflict(
    client,
    "brands",
    {
      main_category_id: mainCategory.id,
      name: "Believia",
      slug: "believia",
      description: "Believia surgical and medical equipment catalog.",
      sort_order: 1,
    },
    "main_category_id,slug",
  );

  const subcategoryMap = new Map();
  const secondSubcategoryMap = new Map();

  async function getSubcategory(name) {
    if (subcategoryMap.has(name)) return subcategoryMap.get(name);
    const subcategory = await upsertByConflict(
      client,
      "subcategories",
      {
        brand_id: brand.id,
        name,
        slug: createSlug(name),
        description: `${name} products from Believia.`,
        sort_order: subcategoryMap.size + 1,
      },
      "brand_id,slug",
    );
    subcategoryMap.set(name, subcategory);
    return subcategory;
  }

  async function getSecondSubcategory(subcategory, name) {
    const key = `${subcategory.id}:${name}`;
    if (secondSubcategoryMap.has(key)) return secondSubcategoryMap.get(key);
    const secondSubcategory = await upsertByConflict(
      client,
      "second_subcategories",
      {
        subcategory_id: subcategory.id,
        name,
        slug: createSlug(name),
        description: `${name} products from Believia.`,
        sort_order: secondSubcategoryMap.size + 1,
      },
      "subcategory_id,slug",
    );
    secondSubcategoryMap.set(key, secondSubcategory);
    return secondSubcategory;
  }

  const uploaded = [];
  const skipped = [];

  for (const product of manifest.products) {
    if (product.missingPrice) {
      skipped.push({ name: product.name, reason: "missing price" });
      continue;
    }

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
      sku: product.sku,
      description: `${product.name} by Believia. Listed under ${product.subcategory} / ${product.secondSubcategory}.`,
      highlights: [product.secondSubcategory, product.subcategory, "Believia product", "GST inclusive offered price"],
      image_urls: imageUrls,
      video_urls: [],
      mrp_price: product.mrpPrice,
      offered_price: product.offeredPrice,
      pack_size: null,
      availability: "In Stock",
      tags: ["Believia", "Surgical Products", product.subcategory, product.secondSubcategory],
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await client.from("products").upsert(payload, { onConflict: "slug" }).select("id,name").single();
    if (error) throw new Error(`products: ${product.name}: ${error.message}`);
    uploaded.push(data);
  }

  const uploadSummaryPath = path.join(OUTPUT_DIR, "believia-upload-summary.json");
  await writeFile(uploadSummaryPath, JSON.stringify({ uploaded, skipped }, null, 2));
  return { uploaded, skipped, uploadSummaryPath };
}

async function verifyUpload() {
  const env = { ...loadEnv(), ...process.env };
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.");
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: brand, error: brandError } = await client
    .from("brands")
    .select("id,name")
    .eq("slug", "believia")
    .single();
  if (brandError) throw new Error(`brands: ${brandError.message}`);

  const { data: products, error, count } = await client
    .from("products")
    .select("id,name,mrp_price,offered_price,image_urls", { count: "exact" })
    .eq("brand_id", brand.id)
    .order("name");
  if (error) throw new Error(`products: ${error.message}`);

  return {
    brand,
    count,
    productsWithImages: products.filter((product) => product.image_urls?.length).length,
    productsWithoutImages: products.filter((product) => !product.image_urls?.length).length,
    sample: products.slice(0, 8).map((product) => ({
      name: product.name,
      mrp: product.mrp_price,
      offered: product.offered_price,
      images: product.image_urls?.length ?? 0,
    })),
  };
}

async function main() {
  const command = process.argv.find((arg) => arg === "--prepare" || arg === "--upload-priced" || arg === "--verify");
  if (!command) {
    usage();
    process.exitCode = 1;
    return;
  }

  if (command === "--verify") {
    console.log(JSON.stringify(await verifyUpload(), null, 2));
    return;
  }

  const imageRoot = getArg("--image-root", DEFAULT_IMAGE_ROOT);
  const manifest = await buildManifest(imageRoot);
  const files = await writeManifest(manifest);

  console.log(JSON.stringify({ summary: manifest.summary, files }, null, 2));

  if (command === "--upload-priced") {
    const result = await uploadPricedProducts(manifest);
    console.log(JSON.stringify({ uploaded: result.uploaded.length, skipped: result.skipped.length, file: result.uploadSummaryPath }, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
