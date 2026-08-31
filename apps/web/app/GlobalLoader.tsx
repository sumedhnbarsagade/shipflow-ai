"use client";

import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export function GlobalLoader() {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  
  // Use a state wrapper to avoid any server/client hydration mismatch
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isLoading = isFetching > 0 || isMutating > 0;

  if (!isLoading) return null;

  return <div className="global-loading-bar" />;
}
