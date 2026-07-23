"use client";

import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { cn } from "@/lib/utils";

// Minimal element map: just enough to make agent prose readable in our palette.
const components: Components = {
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-primary underline">
      {children}
    </a>
  ),
  h1: ({ children }) => <h1 className="mb-2 mt-4 font-serif text-xl font-semibold">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2 mt-4 font-serif text-lg font-semibold">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-1 mt-3 font-serif text-base font-semibold">{children}</h3>,
  code: ({ children }) => (
    <code className="rounded bg-secondary px-1 py-0.5 font-mono text-[0.85em]">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-lg bg-secondary p-3 font-mono text-[12px]">
      {children}
    </pre>
  ),
  hr: () => <hr className="my-4 border-border" />,
};

export const Response = memo(function Response({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={cn("text-[15px] leading-relaxed text-foreground", className)}>
      <ReactMarkdown components={components}>{children}</ReactMarkdown>
    </div>
  );
});
