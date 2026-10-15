"use client";

import { useEffect, useState } from "react";
import { useSWRConfig } from "swr";

export type LiveStatus = "connecting" | "live" | "offline";

/**
 * Subscribes to the API's Server-Sent Events stream. Events only carry a
 * ticket id; we refetch the affected lists and detail views through the
 * normal REST endpoints, so access rules stay on the server.
 */
export function useLiveUpdates() {
  const { mutate } = useSWRConfig();
  const [status, setStatus] = useState<LiveStatus>("connecting");

  useEffect(() => {
    const source = new EventSource("/api/events");

    const refresh = (event: MessageEvent) => {
      const { ticketId } = JSON.parse(event.data) as { ticketId: string };
      mutate(
        (key) =>
          typeof key === "string" &&
          (key.startsWith("/tickets?") || key === `/tickets/${ticketId}` || key === "/admin/stats"),
      );
    };

    source.onopen = () => setStatus("live");
    source.onerror = () => setStatus(source.readyState === EventSource.CLOSED ? "offline" : "connecting");
    source.addEventListener("ticket.created", refresh);
    source.addEventListener("ticket.updated", refresh);

    return () => source.close();
  }, [mutate]);

  return status;
}
