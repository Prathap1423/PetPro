"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageSkeleton } from "@/components/page-skeleton";
import { supabase } from "@/storage/supabase";

/** Renders the app only for a signed-in user; anyone else goes to the login page. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSignedIn(true);
      else router.replace("/login");
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) router.replace("/login");
      else if (event === "SIGNED_IN") setSignedIn(true);
    });
    return () => data.subscription.unsubscribe();
  }, [router]);
  return signedIn ? children : <PageSkeleton />;
}
