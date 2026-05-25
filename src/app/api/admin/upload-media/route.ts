import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "product-media";
export const runtime = "nodejs";
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

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function safeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return jsonError("Supabase server credentials are not configured.", 500);
  }

  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;

  if (!token) {
    return jsonError("Admin session is required.", 401);
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData.user) {
    return jsonError("Invalid admin session.", 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return jsonError("Only admins can upload product media.", 403);
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const kind = formData.get("kind") === "video" ? "videos" : "images";

  if (!(file instanceof File)) {
    return jsonError("Media file is required.", 400);
  }

  if (kind === "images" && !file.type.startsWith("image/")) {
    return jsonError("Please upload an image file.", 400);
  }

  if (kind === "videos" && !file.type.startsWith("video/")) {
    return jsonError("Please upload a video file.", 400);
  }

  const bucket = await adminClient.storage.getBucket(BUCKET);
  if (bucket.error) {
    const { error: createBucketError } = await adminClient.storage.createBucket(BUCKET, bucketOptions);
    if (createBucketError) {
      return jsonError(createBucketError.message, 500);
    }
  } else {
    const { error: updateBucketError } = await adminClient.storage.updateBucket(BUCKET, bucketOptions);
    if (updateBucketError) {
      return jsonError(updateBucketError.message, 500);
    }
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const path = `${kind}/${Date.now()}-${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const { error: uploadError } = await adminClient.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: false
  });

  if (uploadError) {
    return jsonError(uploadError.message, 500);
  }

  const { data } = adminClient.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ path, url: data.publicUrl, kind });
}
