"use client";

import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { fetcher } from "@/lib/api";
import { ToastProvider } from "./toast";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        // Live updates arrive over SSE; this slow poll is only a safety net
        // in case the event stream drops behind a strict proxy.
        refreshInterval: 30_000,
        revalidateOnFocus: true,
        shouldRetryOnError: (error) => error?.status !== 401 && error?.status !== 403 && error?.status !== 404,
      }}
    >
      <ToastProvider>{children}</ToastProvider>
    </SWRConfig>
  );
}
