import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type UserRole = "public" | "salesman" | "admin";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;
}

async function getRequestRole(
  supabaseUrl: string,
  supabaseAnonKey: string,
  serviceRoleKey: string,
  token: string | null
): Promise<UserRole> {
  if (!token) return "public";

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData.user) return "public";

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  return profile?.role === "admin" || profile?.role === "salesman" ? profile.role : "salesman";
}

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return jsonError("Supabase server credentials are not configured.", 500);
  }

  const role = await getRequestRole(supabaseUrl, supabaseAnonKey, serviceRoleKey, getBearerToken(request));
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  let productsQuery = adminClient
    .from("products")
    .select("*")
    .order("updated_at", { ascending: false })
    .range(0, 4999);

  if (role !== "admin") {
    productsQuery = productsQuery.eq("is_active", true);
  }

  const [categoriesResult, brandsResult, subcategoriesResult, secondSubcategoriesResult, productsResult] = await Promise.all([
    adminClient.from("main_categories").select("*").order("sort_order", { ascending: true }),
    adminClient.from("brands").select("*").order("sort_order", { ascending: true }),
    adminClient.from("subcategories").select("*").order("sort_order", { ascending: true }),
    adminClient.from("second_subcategories").select("*").order("sort_order", { ascending: true }),
    productsQuery
  ]);

  const secondSubcategoriesMissing =
    secondSubcategoriesResult.error?.code === "42P01" ||
    secondSubcategoriesResult.error?.message?.toLowerCase().includes("second_subcategories");
  const error =
    categoriesResult.error ??
    brandsResult.error ??
    subcategoriesResult.error ??
    (secondSubcategoriesMissing ? null : secondSubcategoriesResult.error) ??
    productsResult.error;

  if (error) {
    return jsonError(
      `${error.message}. If you just created Supabase, run supabase/schema.sql in the Supabase SQL Editor.`,
      500
    );
  }

  const canSeeOffer = role === "admin" || role === "salesman";

  return NextResponse.json({
    categories: categoriesResult.data ?? [],
    brands: brandsResult.data ?? [],
    subcategories: subcategoriesResult.data ?? [],
    secondSubcategories: secondSubcategoriesMissing ? [] : secondSubcategoriesResult.data ?? [],
    products: (productsResult.data ?? []).map((product) => ({
      ...product,
      second_subcategory_id: product.second_subcategory_id ?? null,
      offered_price: canSeeOffer ? product.offered_price : null
    })),
    schemaWarning: secondSubcategoriesMissing
      ? "Second subcategory table is missing. Run supabase/migrations/2026-05-25-second-subcategories-and-storage.sql in Supabase SQL Editor."
      : null
  });
}
