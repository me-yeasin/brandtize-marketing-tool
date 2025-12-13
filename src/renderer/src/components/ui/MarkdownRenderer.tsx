import Markdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import remarkGfm from 'remark-gfm'

interface MarkdownRendererProps {
  content: string
  className?: string
}

function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps): React.JSX.Element {
  return (
    <article className={`prose prose-sm max-w-none ${className}`}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const codeString = String(children).replace(/\n$/, '')

            if (match) {
              return (
                <SyntaxHighlighter
                  style={oneDark}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem'
                  }}
                >
                  {codeString}
                </SyntaxHighlighter>
              )
            }

            return (
              <code className={className} {...props}>
                {children}
              </code>
            )
          },
          pre({ children }) {
            return <div className="not-prose my-4">{children}</div>
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-hover underline"
              >
                {children}
              </a>
            )
          },
          ul({ children }) {
            return <ul className="list-disc pl-6 my-2 space-y-1">{children}</ul>
          },
          ol({ children }) {
            return <ol className="list-decimal pl-6 my-2 space-y-1">{children}</ol>
          },
          li({ children }) {
            return <li className="text-text-main">{children}</li>
          },
          p({ children }) {
            return <p className="my-2 leading-relaxed">{children}</p>
          },
          h1({ children }) {
            return <h1 className="text-2xl font-bold mt-4 mb-2">{children}</h1>
          },
          h2({ children }) {
            return <h2 className="text-xl font-bold mt-4 mb-2">{children}</h2>
          },
          h3({ children }) {
            return <h3 className="text-lg font-semibold mt-3 mb-2">{children}</h3>
          },
          h4({ children }) {
            return <h4 className="text-base font-semibold mt-3 mb-1">{children}</h4>
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-primary pl-4 my-3 text-text-muted italic">
                {children}
              </blockquote>
            )
          },
          hr() {
            return <hr className="border-border my-4" />
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border border-border rounded-lg overflow-hidden">
                  {children}
                </table>
              </div>
            )
          },
          thead({ children }) {
            return <thead className="bg-surface">{children}</thead>
          },
          th({ children }) {
            return (
              <th className="px-4 py-2 text-left text-text-main font-semibold border-b border-border">
                {children}
              </th>
            )
          },
          td({ children }) {
            return <td className="px-4 py-2 text-text-main border-b border-border">{children}</td>
          },
          strong({ children }) {
            return <strong className="font-semibold text-text-main">{children}</strong>
          },
          em({ children }) {
            return <em className="italic">{children}</em>
          }
        }}
      >
        {content}
      </Markdown>
    </article>
  )
}

export { MarkdownRenderer }
