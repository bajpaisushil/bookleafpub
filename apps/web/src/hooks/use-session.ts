"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

export function useSession() {
  const router = useRouter();
  const { data, isLoading } = useSWR<{ user: User }>("/auth/me", { refreshInterval: 0 });

  async function logout() {
    await api("/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return { user: data?.user, isLoading, logout };
}
