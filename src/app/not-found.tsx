import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1
          className="text-5xl font-bold tracking-[0.2em] text-[#3d8b8b]"
          style={{ fontFamily: "system-ui, sans-serif" }}
        >
          404
        </h1>
        <p className="text-lg text-muted-foreground">
          This page could not be found.
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2 text-sm font-medium border rounded-lg hover:bg-muted transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
