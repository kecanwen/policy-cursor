import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './style.less';

export default function SseMarkdown({
  content,
  streaming,
}: {
  content: string;
  streaming?: boolean;
}) {
  if (!content) return null;
  return (
    <div className={`pm-markdown pm-sse-markdown ${streaming ? 'pm-blink' : ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
