import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return jsonError("Supabase server credentials are not configured.", 500);
  }

  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;

  if (!token) {
    return jsonError("Session token is required.", 401);
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData.user) {
    return jsonError("Invalid session.", 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id,email,full_name,role")
    .eq("id", userData.user.id)
    .single();

  if (profileError) {
    return jsonError(profileError.message, 500);
  }

  return NextResponse.json({
    user: {
      id: userData.user.id,
      email: userData.user.email
    },
    profile,
    role: profile?.role ?? "salesman"
  });
}

