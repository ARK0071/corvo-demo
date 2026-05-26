"use client";

import { signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";

function UnauthorizedContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 p-8 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          {error === "no_account" ? (
            <p className="text-sm text-muted-foreground">
              Your email is not associated with an active account.
              Please contact your administrator to get access.
            </p>
          ) : error === "Configuration" ? (
            <p className="text-sm text-muted-foreground">
              Sign-in could not complete because the database is unavailable or
              not set up. Ensure your RDS tunnel is running, run{" "}
              <code className="text-xs">npx prisma db push</code>, then try again.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              You do not have permission to access this application.
              If you believe this is an error, contact your administrator.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Sign out and try a different account
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function UnauthorizedPage() {
  return (
    <Suspense>
      <UnauthorizedContent />
    </Suspense>
  );
}
