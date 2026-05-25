import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

function parseEnv(text) {
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [
          line.slice(0, index).trim(),
          line
            .slice(index + 1)
            .trim()
            .replace(/^['"]|['"]$/g, "")
        ];
      })
  );
}

const env = parseEnv(await readFile(".env", "utf8"));
const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const bucketOptions = {
  public: true,
  fileSizeLimit: 1024 * 1024 * 50,
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
    "video/webm",
    "video/quicktime"
  ]
};

if (process.argv[2] === "ensure") {
  const existing = await client.storage.getBucket("product-media");
  const result = existing.error
    ? await client.storage.createBucket("product-media", bucketOptions)
    : await client.storage.updateBucket("product-media", bucketOptions);

  if (result.error) {
    throw new Error(result.error.message);
  }
}

const { data, error } = await client.storage.getBucket("product-media");

console.log(
  JSON.stringify(
    {
      error: error?.message,
      bucket: data
        ? {
            id: data.id,
            public: data.public,
            file_size_limit: data.file_size_limit,
            allowed_mime_types: data.allowed_mime_types
          }
        : null
    },
    null,
    2
  )
);
