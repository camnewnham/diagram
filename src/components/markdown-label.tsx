"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

export function MarkdownLabel({ text }: { text: string }) {
  return (
    <div
      className="text-center text-sm max-w-none
      [&_p]:m-0
      [&_strong]:font-bold
      [&_em]:italic
      [&_code]:font-mono [&_code]:bg-muted [&_code]:rounded [&_code]:px-1 [&_code]:text-xs
      [&_h1]:text-base [&_h1]:font-bold [&_h1]:m-0
      [&_h2]:text-sm [&_h2]:font-bold [&_h2]:m-0
      [&_h3]:text-xs [&_h3]:font-bold [&_h3]:m-0
      [&_ul]:list-disc [&_ul]:list-inside [&_ul]:m-0 [&_ul]:text-left
      [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:m-0 [&_ol]:text-left
      [&_a]:underline [&_a]:text-primary
      [&_table]:border-collapse [&_table]:text-xs
      [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-0.5 [&_th]:font-semibold
      [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-0.5
      [&_del]:line-through
      [&_input[type=checkbox]]:mr-1
      [&_img]:max-w-full [&_img]:h-auto"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
