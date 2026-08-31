"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../lib/auth-client";

export function InactivityHandler() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only track activity if user is logged in
    if (!session) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const logoutUser = async () => {
      try {
        await authClient.signOut();
        router.push("/auth");
      } catch (error) {
        console.error("Failed to sign out inactive user:", error);
      }
    };

    const resetTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      // 10 minutes = 10 * 60 * 1000 = 600,000 ms
      timerRef.current = setTimeout(logoutUser, 10 * 60 * 1000);
    };

    // Set initial timer
    resetTimer();

    // Event listeners for activity
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    const handleActivity = () => {
      resetTimer();
    };

    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [session, router]);

  return null;
}
