import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const appUrl = process.argv[2] ?? "http://localhost:3000";
const email = process.argv[3];
const password = process.argv[4];

if (!email || !password) {
  throw new Error("Usage: node scripts/smoke-upload.mjs <app-url> <admin-email> <admin-password>");
}

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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const env = parseEnv(await readFile(".env", "utf8"));
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceKey) {
  throw new Error("Missing Supabase environment values in .env");
}

const authClient = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const { data: sessionData, error: signInError } = await authClient.auth.signInWithPassword({
  email,
  password
});

if (signInError || !sessionData.session?.access_token) {
  throw new Error(signInError?.message ?? "Admin sign in failed.");
}

async function uploadSmokeFile(kind, blob, filename) {
  const form = new FormData();
  form.append("kind", kind);
  form.append("file", blob, filename);

  const response = await fetch(`${appUrl}/api/admin/upload-media`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionData.session.access_token}`
    },
    body: form
  });
  const body = await response.json();

  if (!response.ok) {
    throw new Error(`${kind} upload failed: ${body.error ?? response.status}`);
  }

  assert(body.url?.includes("/storage/v1/object/public/product-media/"), `${kind} public URL missing.`);
  assert(body.path?.includes(filename), `${kind} storage path missing filename.`);
  return body.path;
}

const stamp = Date.now();
const imageBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64"
);
const videoBytes = Buffer.from("codex-smoke-webm");
const uploadedPaths = [];

try {
  uploadedPaths.push(
    await uploadSmokeFile("image", new Blob([imageBytes], { type: "image/png" }), `codex-smoke-${stamp}.png`)
  );
  uploadedPaths.push(
    await uploadSmokeFile("video", new Blob([videoBytes], { type: "video/webm" }), `codex-smoke-${stamp}.webm`)
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        uploaded: uploadedPaths.length
      },
      null,
      2
    )
  );
} finally {
  if (uploadedPaths.length > 0) {
    await adminClient.storage.from("product-media").remove(uploadedPaths);
  }
}
