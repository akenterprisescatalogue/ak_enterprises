"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import type { User } from "@supabase/supabase-js";

import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/types";

type AuthContextValue = {
  user: User | null;
  accessToken: string | null;
  role: UserRole;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setPreviewRole: (role: UserRole) => void;
};

type RoleLookupResult = {
  data: { role: string } | null;
  error: { message: string } | null;
};

type RoleCachePayload = {
  role?: UserRole;
  cachedAt?: number;
};

type ServerRoleResult = {
  role?: string;
  error?: string;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const ROLE_CACHE_PREFIX = "ak-role-cache";
const ROLE_CACHE_TTL_MS = 5 * 60 * 1000;
async function runWithTimeout<T>(task: () => PromiseLike<T>, message: string, timeoutMs = 12000) {
  let timeoutId: number | undefined;

  try {
    return await Promise.race([
      task(),
      new Promise<never>((_resolve, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
      })
    ]);
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  }
}

function normalizeRole(role: unknown): UserRole {
  return role === "admin" || role === "salesman" ? role : "salesman";
}

function getRoleCacheKey(userId: string) {
  return `${ROLE_CACHE_PREFIX}:${userId}`;
}

function getCachedRole(payload: RoleCachePayload | null): UserRole | null {
  return payload?.role === "admin" || payload?.role === "salesman" ? payload.role : null;
}

function isRoleCacheFresh(payload: RoleCachePayload | null) {
  return Boolean(payload?.cachedAt && Date.now() - payload.cachedAt < ROLE_CACHE_TTL_MS);
}

function readCachedRolePayload(userId: string): RoleCachePayload | null {
  try {
    const cached = window.localStorage.getItem(getRoleCacheKey(userId));
    if (!cached) return null;
    const payload = JSON.parse(cached) as RoleCachePayload;
    return getCachedRole(payload) ? payload : null;
  } catch {
    return null;
  }
}


function writeCachedRole(userId: string, nextRole: UserRole) {
  try {
    window.localStorage.setItem(getRoleCacheKey(userId), JSON.stringify({ role: nextRole, cachedAt: Date.now() }));
  } catch {
    // Local storage can be unavailable in private browsing; auth still works without the cache.
  }
}

async function loadRole(
  user: User | null,
  accessToken?: string | null,
  fallbackRole: UserRole = "salesman"
): Promise<UserRole> {
  if (!supabase || !user) return "public";

  const client = supabase;

  if (accessToken) {
    try {
      const response = await runWithTimeout(
        () =>
          fetch("/api/auth/me", {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }),
        "Server role lookup timed out.",
        8000
      );
      const payload = (await response.json()) as ServerRoleResult;

      if (response.ok) {
        return normalizeRole(payload.role);
      }

      console.warn(payload.error ?? "Server role lookup failed.");
    } catch (error) {
      console.warn(error instanceof Error ? error.message : "Server role lookup failed.");
    }
  }

  try {
    const { data, error } = (await runWithTimeout(
      () =>
        client
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single(),
      "Login succeeded, but the role lookup timed out. Check the Supabase profiles table and policies.",
      8000
    )) as RoleLookupResult;

    if (error || !data?.role) {
      console.warn(error?.message ?? "Profile role missing.");
      return fallbackRole;
    }

    return normalizeRole(data.role);
  } catch (error) {
    console.warn(error instanceof Error ? error.message : "Role lookup failed.");
    return fallbackRole;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>("public");
  const [loading, setLoading] = useState(true);

  const setPreviewRole = useCallback((nextRole: UserRole) => {
    if (isSupabaseConfigured) return;
    setRole(nextRole);
    window.localStorage.setItem("ak-preview-role", nextRole);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      if (!supabase) {
        const storedRole =
          typeof window !== "undefined"
            ? (window.localStorage.getItem("ak-preview-role") as UserRole | null)
            : null;

        if (mounted) {
          setRole(storedRole ?? "public");
          setLoading(false);
        }
        return;
      }

      const client = supabase;
      try {
        const { data } = await runWithTimeout(
          () => client.auth.getSession(),
          "Supabase session check timed out.",
          8000
        );
        const currentUser = data.session?.user ?? null;
        const sessionAccessToken = data.session?.access_token ?? null;

        if (!currentUser) {
          if (mounted) {
            setUser(null);
            setAccessToken(null);
            setRole("public");
          }
          return;
        }

        const cachedRolePayload = readCachedRolePayload(currentUser.id);
        const cachedRole = getCachedRole(cachedRolePayload);
        if (mounted) {
          setUser(currentUser);
          setAccessToken(sessionAccessToken);
          if (cachedRole) {
            setRole(cachedRole);
            setLoading(false);
          }
        }

        if (cachedRole && isRoleCacheFresh(cachedRolePayload)) return;

        const nextRole = await loadRole(currentUser, sessionAccessToken, cachedRole ?? "salesman");
        writeCachedRole(currentUser.id, nextRole);

        if (mounted) {
          setRole(nextRole);
        }
      } catch (error) {
        console.warn(error instanceof Error ? error.message : "Session check failed.");
        if (mounted) {
          setUser(null);
          setAccessToken(null);
          setRole("public");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void boot();

    const subscription = supabase?.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;

      const currentUser = session?.user ?? null;

      if (!currentUser) {
        if (mounted) {
          setUser(null);
          setAccessToken(null);
          setRole("public");
          setLoading(false);
        }
        return;
      }

      const sessionAccessToken = session?.access_token ?? null;
      const cachedRolePayload = readCachedRolePayload(currentUser.id);
      const cachedRole = getCachedRole(cachedRolePayload);

      if (mounted) {
        setUser(currentUser);
        setAccessToken(sessionAccessToken);
        if (cachedRole) setRole(cachedRole);
        setLoading(false);
      }

      if (cachedRole && isRoleCacheFresh(cachedRolePayload)) return;

      window.setTimeout(() => {
        if (!mounted) return;
        void loadRole(currentUser, sessionAccessToken, cachedRole ?? "salesman").then((nextRole) => {
          writeCachedRole(currentUser.id, nextRole);
          if (mounted) {
            setRole(nextRole);
            setLoading(false);
          }
        });
      }, 0);
    });

    return () => {
      mounted = false;
      subscription?.data.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      setRole("admin");
      window.localStorage.setItem("ak-preview-role", "admin");
      return;
    }

    const client = supabase;
    setLoading(true);
    let result: Awaited<ReturnType<typeof client.auth.signInWithPassword>>;

    try {
      result = await runWithTimeout(
        () => client.auth.signInWithPassword({ email: email.trim(), password }),
        "Supabase sign in timed out. Check internet access, Supabase Auth settings, and your .env values."
      );
    } finally {
      setLoading(false);
    }

    if (result.error) throw new Error(result.error.message);
    if (!result.data.user) throw new Error("No user was returned from Supabase.");

    const nextRole = await loadRole(result.data.user, result.data.session?.access_token);
    writeCachedRole(result.data.user.id, nextRole);
    setUser(result.data.user);
    setAccessToken(result.data.session?.access_token ?? null);
    setRole(nextRole);
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) {
      setUser(null);
      setAccessToken(null);
      setRole("public");
      window.localStorage.setItem("ak-preview-role", "public");
      return;
    }

    const client = supabase;
    setUser(null);
    setAccessToken(null);
    setRole("public");
    const { error } = await runWithTimeout(
      () => client.auth.signOut({ scope: "local" }),
      "Supabase sign out timed out.",
      8000
    );
    if (error) {
      console.warn("Supabase sign out warning:", error.message);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      role,
      loading,
      isConfigured: isSupabaseConfigured,
      signIn,
      signOut,
      setPreviewRole
    }),
    [user, accessToken, role, loading, signIn, signOut, setPreviewRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return value;
}
