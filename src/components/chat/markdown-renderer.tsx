"use client";

import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const components: Components = {
  table: ({ children, ...props }) => (
    <div className="my-3 overflow-x-auto rounded-lg border">
      <table className="w-full caption-bottom text-sm" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="[&_tr]:border-b" {...props}>
      {children}
    </thead>
  ),
  th: ({ children, ...props }) => (
    <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="p-4 align-middle border-t" {...props}>
      {children}
    </td>
  ),
  tr: ({ children, ...props }) => (
    <tr className="border-b transition-colors hover:bg-muted/50" {...props}>
      {children}
    </tr>
  ),
  p: ({ children, ...props }) => (
    <p className="mb-2 last:mb-0 text-sm leading-relaxed" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }) => (
    <ul className="mb-2 list-disc pl-5 space-y-1" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="mb-2 list-decimal pl-5 space-y-1" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="text-sm leading-relaxed" {...props}>
      {children}
    </li>
  ),
  h1: ({ children, ...props }) => (
    <h1 className="mb-2 mt-4 text-xl font-bold tracking-tight first:mt-0" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 className="mb-2 mt-3 text-lg font-semibold tracking-tight first:mt-0" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="mb-1 mt-3 text-base font-semibold first:mt-0" {...props}>
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4 className="mb-1 mt-2 text-sm font-semibold first:mt-0" {...props}>
      {children}
    </h4>
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-semibold text-foreground" {...props}>
      {children}
    </strong>
  ),
  code: ({ children, className, ...props }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="rounded-sm bg-muted px-1.5 py-0.5 text-sm font-mono text-foreground" {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className="block rounded-md bg-muted p-3 text-sm font-mono overflow-x-auto" {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children, ...props }) => (
    <pre className="my-2 overflow-x-auto rounded-md bg-muted p-3" {...props}>
      {children}
    </pre>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote className="my-2 border-l-2 border-border pl-4 italic text-muted-foreground" {...props}>
      {children}
    </blockquote>
  ),
  hr: (props) => <hr className="my-4 border-border" {...props} />,
  a: ({ children, href, ...props }) => (
    <a href={href} className="text-primary underline underline-offset-4 hover:text-primary/80" target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  ),
};

// Keep remarkPlugins array stable across renders to avoid ReactMarkdown re-initializing
const remarkPlugins = [remarkGfm];

function MarkdownRendererInner({ content }: { content: string }) {
  // Memoize the rendered output - only re-render when content string changes
  return useMemo(
    () => (
      <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
        {content}
      </ReactMarkdown>
    ),
    [content]
  );
}

// Memo wrapper: prevent parent re-renders from causing unnecessary work
export const MarkdownRenderer = memo(MarkdownRendererInner);
