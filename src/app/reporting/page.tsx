"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ReportingRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/reporting/overview");
  }, [router]);
  return null;
}
