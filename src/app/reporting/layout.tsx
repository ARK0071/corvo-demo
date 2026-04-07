"use client";

import ReportingNav from "./components/ReportingNav";

export default function ReportingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ReportingNav />
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
