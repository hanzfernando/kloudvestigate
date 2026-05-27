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
        if (block.type === "table") {
          return (
            <div className="overflow-x-auto" key={index}>
              <table className="ops-table">
                <thead>
                  <tr>
                    {block.headers.map((header) => <th key={header}>{renderInline(header)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={`${row.join("|")}-${rowIndex}`}>
                      {row.map((cell, cellIndex) => (
                        <td key={`${cell}-${cellIndex}`}>{renderInline(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return <p key={index}>{renderInline(block.lines.join(" "))}</p>;
      })}
    </div>
  );
}

type Block =
  | {
      type: "paragraph" | "heading" | "code" | "list" | "numbered";
      lines: string[];
      level?: 2 | 3;
    }
  | {
      type: "table";
      headers: string[];
      rows: string[][];
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

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

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

    if (isTableHeader(lines, index)) {
      flushParagraph();
      const headers = parseTableCells(line);
      const rows: string[][] = [];
      index += 2;

      while (index < lines.length && isTableRow(lines[index])) {
        rows.push(normalizeTableRow(parseTableCells(lines[index]), headers.length));
        index += 1;
      }

      index -= 1;
      blocks.push({ type: "table", headers, rows });
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

function isTableHeader(lines: string[], index: number) {
  return isTableRow(lines[index]) && isTableSeparator(lines[index + 1]);
}

function isTableRow(line?: string) {
  if (!line) return false;
  const trimmed = line.trim();
  return trimmed.includes("|") && !trimmed.startsWith("```");
}

function isTableSeparator(line?: string) {
  if (!line) return false;
  return parseTableCells(line).every((cell) => /^:?-{3,}:?$/.test(cell));
}

function parseTableCells(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function normalizeTableRow(row: string[], columnCount: number) {
  if (row.length === columnCount) return row;
  if (row.length > columnCount) return row.slice(0, columnCount);
  return [...row, ...Array.from({ length: columnCount - row.length }, () => "")];
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
