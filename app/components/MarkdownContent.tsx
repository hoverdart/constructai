'use client';

import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';

interface MarkdownContentProps {
  content: string;
  onHighlight?: (orderId: string) => void;
}

export default function MarkdownContent({ content, onHighlight }: MarkdownContentProps) {
  const components: Components = {
    h1: ({ children }) => <p className="mb-1 font-semibold text-base">{children}</p>,
    h2: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
    h3: ({ children }) => <p className="mb-0.5 font-medium">{children}</p>,
    p:  ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    em:     ({ children }) => <em className="italic">{children}</em>,
    ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-0.5 last:mb-0">{children}</ul>,
    ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-0.5 last:mb-0">{children}</ol>,
    li: ({ children }) => <li>{children}</li>,
    hr: () => <hr className="my-2 border-zinc-300" />,
    blockquote: ({ children }) => (
      <blockquote className="mb-2 border-l-2 border-zinc-400 pl-3 italic text-zinc-600 last:mb-0">
        {children}
      </blockquote>
    ),
    code: ({ children }) => (
      <code className="rounded bg-zinc-200 px-1 py-0.5 font-mono text-xs text-zinc-700">{children}</code>
    ),
    pre: ({ children }) => (
      <pre className="mb-2 overflow-x-auto rounded-lg bg-zinc-200 p-2 font-mono text-xs text-zinc-700 last:mb-0">
        {children}
      </pre>
    ),
    table: ({ children }) => (
      <div className="mb-2 overflow-x-auto last:mb-0">
        <table className="min-w-full border-collapse text-xs">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="border-b border-zinc-300">{children}</thead>,
    tbody: ({ children }) => <tbody className="divide-y divide-zinc-200">{children}</tbody>,
    th: ({ children }) => (
      <th className="py-1 pr-3 text-left font-semibold text-zinc-600 first:pl-0">{children}</th>
    ),
    td: ({ children }) => (
      <td className="py-1 pr-3 text-zinc-700 first:pl-0">{children}</td>
    ),
    a: ({ href, children }) => {
      if (href?.startsWith('highlight:') && onHighlight) {
        const orderId = decodeURIComponent(href.slice('highlight:'.length));
        return (
          <button
            type="button"
            onClick={() => onHighlight(orderId)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-blue-100 px-1.5 py-0.5 font-medium text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-200 hover:text-blue-900 text-xs"
          >
            <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 6h18M3 14h12M3 18h8" />
            </svg>
            {children}
          </button>
        );
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="underline text-blue-600 hover:text-blue-800">
          {children}
        </a>
      );
    },
  };

  return <ReactMarkdown components={components}>{content}</ReactMarkdown>;
}
