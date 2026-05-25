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

type ServerRoleResult = {
  role?: string;
  error?: string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

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

async function loadRole(user: User | null, accessToken?: string | null): Promise<UserRole> {
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
      return "salesman";
    }

    return normalizeRole(data.role);
  } catch (error) {
    console.warn(error instanceof Error ? error.message : "Role lookup failed.");
    return "salesman";
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
        const nextRole = await loadRole(currentUser, data.session?.access_token);

        if (mounted) {
          setUser(currentUser);
          setAccessToken(data.session?.access_token ?? null);
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

    const subscription = supabase?.auth.onAuthStateChange((_event, session) => {
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

      if (mounted) {
        setUser(currentUser);
        setAccessToken(session?.access_token ?? null);
        setLoading(true);
      }

      window.setTimeout(() => {
        if (!mounted) return;
        void loadRole(currentUser, session?.access_token).then((nextRole) => {
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
