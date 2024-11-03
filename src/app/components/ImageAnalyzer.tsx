'use client';
import 'katex/dist/katex.min.css';
import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import type { Components } from 'react-markdown';

const InlineMath = dynamic(() => import('react-katex').then(mod => mod.InlineMath), {
  ssr: false
});

interface ImageAnalyzerProps {
  image: string;
}

export function ImageAnalyzer({ image }: ImageAnalyzerProps) {
  // Pre-process the text to convert \( \) to $ $ format
  const processText = (text: string) => {
    return text
      .replace(/\\\((.*?)\\\)/g, '$$$1$$')  // Convert inline math \( \) to $ $
      .replace(/\\\[(.*?)\\\]/g, '$$$$1$$$$');  // Convert display math \[ \] to $$ $$
  };

  const components: Components = {
    p: ({ children }) => <p className="mb-4">{children}</p>,
    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    // Handle nested list items
    ul: ({ children }) => <ul className="list-disc pl-6 mb-4">{children}</ul>,
    li: ({ children }) => {
      if (typeof children === 'string') {
        // Process any LaTeX in list items
        const processedText = processText(children);
        return <li className="mb-2">{processedText}</li>;
      }
      return <li className="mb-2">{children}</li>;
    },
    // Handle inline code and math
    code: ({ children }) => {
      const content = String(children).trim();
      if (content.startsWith('$') && content.endsWith('$')) {
        return <InlineMath math={content.slice(1, -1)} />;
      }
      return <code>{children}</code>;
    }
  };

  const processedImage = processText(image);

  return (
    <div className="mt-2 prose max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {processedImage}
      </ReactMarkdown>
    </div>
  );
} 