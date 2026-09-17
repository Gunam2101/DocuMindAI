import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = "" }) => {
  if (!content) return null;

  return (
    <div className={`markdown-content leading-relaxed text-sm text-ink-300 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-4 mb-2 text-lg font-bold text-ink-100 first:mt-0 border-b border-base-700/50 pb-1">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-3.5 mb-2 text-base font-semibold text-ink-100 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-3 mb-1.5 text-sm font-semibold text-accent-400 first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="mt-2.5 mb-1 text-sm font-semibold text-ink-200 first:mt-0">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="my-2 leading-relaxed text-ink-300 first:mt-0 last:mb-0">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-ink-100">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-ink-200">{children}</em>
          ),
          ul: ({ children }) => (
            <ul className="my-2 ml-5 list-disc space-y-1 text-ink-300">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 ml-5 list-decimal space-y-1 text-ink-300">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-1 marker:text-accent-400">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-accent-500/70 bg-base-850/60 py-2 px-3.5 rounded-r-lg text-ink-300 italic">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-base-700/60" />,
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-base-700/70 bg-base-900/70">
              <table className="w-full text-left text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-base-800/80 text-xs uppercase tracking-wider text-ink-200">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-base-700/50">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="transition-colors hover:bg-base-800/30">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-3.5 py-2 font-semibold text-ink-100">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-3.5 py-2 text-ink-300">{children}</td>
          ),
          code: ({ className: codeClassName, children, ...props }) => {
            const match = /language-(\w+)/.exec(codeClassName || "");
            const isInline = !match && !String(children).includes("\n");
            if (isInline) {
              return (
                <code
                  className="rounded border border-base-700/50 bg-base-800/90 px-1.5 py-0.5 font-mono text-xs font-medium text-accent-400"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <div className="my-3 overflow-hidden rounded-xl border border-base-700/70 bg-base-950">
                {match && (
                  <div className="flex items-center justify-between border-b border-base-700/60 bg-base-900/80 px-4 py-1.5 text-xs font-mono text-ink-400">
                    <span>{match[1]}</span>
                  </div>
                )}
                <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-ink-200">
                  <code className={codeClassName} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            );
          },
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent-400 underline underline-offset-2 hover:text-accent-300 transition-colors"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
