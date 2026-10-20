import Link from "next/link";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const components: Components = {
  h1: ({ children }) => (
    <h1 className="font-almanac-display text-4xl tracking-[0.06em] text-almanac-ink md:text-5xl">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-12 font-almanac-display text-2xl tracking-[0.04em] text-almanac-ink md:text-3xl">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-8 text-lg font-semibold text-almanac-ink">{children}</h3>
  ),
  p: ({ children }) => <p className="mt-4 text-base leading-7 text-almanac-ink-dim">{children}</p>,
  ul: ({ children }) => (
    <ul className="mt-4 list-disc space-y-2 pl-5 text-base leading-7 text-almanac-ink-dim">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-4 list-decimal space-y-2 pl-5 text-base leading-7 text-almanac-ink-dim">
      {children}
    </ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="mt-6 border-l-2 border-almanac-copper-hi/60 pl-4 text-base italic leading-7 text-almanac-ink-dim">
      {children}
    </blockquote>
  ),
  strong: ({ children }) => <strong className="font-semibold text-almanac-ink">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => {
    if (!href) {
      return <span>{children}</span>;
    }
    const isInternal = href.startsWith("/");
    const className =
      "text-almanac-copper-hi underline decoration-almanac-line-hi underline-offset-4 transition-colors hover:text-almanac-starlight";
    if (isInternal) {
      return (
        <Link href={href} className={className}>
          {children}
        </Link>
      );
    }
    return (
      <a href={href} className={className} rel="noopener noreferrer">
        {children}
      </a>
    );
  },
};

interface Props {
  markdown: string;
}

/** Renders guide markdown without raw HTML (react-markdown default). */
export function GuideMarkdown({ markdown }: Props) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
      {markdown}
    </ReactMarkdown>
  );
}
