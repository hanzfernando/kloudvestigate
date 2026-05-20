import type { ReactNode } from "react";

export function MarkdownRenderer({ text }: { text: string }) {
  const blocks = parseBlocks(text);

  return (
    <div className="markdown-response">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const Heading = block.level === 3 ? "h3" : "h2";
          return <Heading key={index}>{renderInline(block.lines[0])}</Heading>;
        }
        if (block.type === "code") {
          return <pre key={index}><code>{block.lines.join("\n")}</code></pre>;
        }
        if (block.type === "list") {
          return (
            <ul key={index}>
              {block.lines.map((line) => <li key={line}>{renderInline(line.replace(/^[-*]\s+/, ""))}</li>)}
            </ul>
          );
        }
        if (block.type === "numbered") {
          return (
            <ol key={index}>
              {block.lines.map((line) => <li key={line}>{renderInline(line.replace(/^\d+\.\s+/, ""))}</li>)}
            </ol>
          );
        }
        return <p key={index}>{renderInline(block.lines.join(" "))}</p>;
      })}
    </div>
  );
}

type Block = {
  type: "paragraph" | "heading" | "code" | "list" | "numbered";
  lines: string[];
  level?: 2 | 3;
};

function parseBlocks(text: string): Block[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let code: string[] | null = null;

  function flushParagraph() {
    if (paragraph.length) {
      blocks.push({ type: "paragraph", lines: paragraph });
      paragraph = [];
    }
  }

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (code) {
        blocks.push({ type: "code", lines: code });
        code = null;
      } else {
        flushParagraph();
        code = [];
      }
      continue;
    }

    if (code) {
      code.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    if (line.startsWith("### ")) {
      flushParagraph();
      blocks.push({ type: "heading", level: 3, lines: [line.slice(4)] });
      continue;
    }

    if (line.startsWith("## ")) {
      flushParagraph();
      blocks.push({ type: "heading", level: 2, lines: [line.slice(3)] });
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      const previous = blocks.at(-1);
      if (previous?.type === "list") previous.lines.push(line);
      else blocks.push({ type: "list", lines: [line] });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      flushParagraph();
      const previous = blocks.at(-1);
      if (previous?.type === "numbered") previous.lines.push(line);
      else blocks.push({ type: "numbered", lines: [line] });
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  if (code) blocks.push({ type: "code", lines: code });
  return blocks;
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(<strong key={`${token}-${match.index}`}>{token.slice(2, -2)}</strong>);
    } else {
      nodes.push(<code key={`${token}-${match.index}`}>{token.slice(1, -1)}</code>);
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}
