import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type CreateSalesmanBody = {
  email?: string;
  password?: string;
  full_name?: string;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function getConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return null;
  }

  return { supabaseUrl, supabaseAnonKey, serviceRoleKey };
}

async function getAdminClient(request: NextRequest) {
  const config = getConfig();
  if (!config) {
    return { error: "Supabase server credentials are not configured.", status: 500 } as const;
  }

  const { supabaseUrl, supabaseAnonKey, serviceRoleKey } = config;
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;

  if (!token) {
    return { error: "Admin session is required.", status: 401 } as const;
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData.user) {
    return { error: "Invalid admin session.", status: 401 } as const;
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const { data: adminProfile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profileError || adminProfile?.role !== "admin") {
    return { error: "Only admins can manage salesman accounts.", status: 403 } as const;
  }

  return { adminClient, adminUserId: userData.user.id } as const;
}

export async function GET(request: NextRequest) {
  const result = await getAdminClient(request);
  if ("error" in result) {
    return jsonError(result.error ?? "Admin access failed.", result.status ?? 500);
  }

  const { data: authUsers } = await result.adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });
  const { data: existingProfiles } = await result.adminClient.from("profiles").select("id");
  const existingProfileIds = new Set((existingProfiles ?? []).map((profile) => profile.id));
  const missingProfiles =
    authUsers?.users
      .filter((user) => user.id !== result.adminUserId && !existingProfileIds.has(user.id))
      .map((user) => ({
        id: user.id,
        email: user.email ?? null,
        full_name:
          typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null,
        role: "salesman"
      })) ?? [];

  if (missingProfiles.length > 0) {
    const { error: syncError } = await result.adminClient.from("profiles").upsert(missingProfiles);
    if (syncError) {
      return jsonError(syncError.message, 500);
    }
  }

  const { data, error } = await result.adminClient
    .from("profiles")
    .select("id,email,full_name,role,created_at")
    .eq("role", "salesman")
    .order("created_at", { ascending: false });

  if (error) {
    return jsonError(error.message, 500);
  }

  return NextResponse.json({ profiles: data ?? [] });
}

export async function POST(request: NextRequest) {
  const result = await getAdminClient(request);
  if ("error" in result) {
    return jsonError(result.error ?? "Admin access failed.", result.status ?? 500);
  }

  const body = (await request.json()) as CreateSalesmanBody;
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const fullName = body.full_name?.trim() ?? "";

  if (!email || !email.includes("@")) {
    return jsonError("Enter a valid salesman email.", 400);
  }

  if (password.length < 6) {
    return jsonError("Password must be at least 6 characters.", 400);
  }

  const { data: createdUser, error: createError } = await result.adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName
    }
  });

  if (createError || !createdUser.user) {
    return jsonError(createError?.message ?? "Unable to create salesman account.", 400);
  }

  const { data: profile, error: upsertError } = await result.adminClient
    .from("profiles")
    .upsert({
      id: createdUser.user.id,
      email,
      full_name: fullName || null,
      role: "salesman"
    })
    .select("id,email,full_name,role,created_at")
    .single();

  if (upsertError) {
    return jsonError(upsertError.message, 500);
  }

  return NextResponse.json({ profile }, { status: 201 });
}
