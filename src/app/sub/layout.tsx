"use client";

import { useCurrentUser } from "@/contexts/user-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SubrecipientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, isSubrecipient } = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user && !isSubrecipient) {
      router.replace("/");
    }
  }, [isLoading, user, isSubrecipient, router]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isSubrecipient) {
    return null;
  }

  return <>{children}</>;
}
