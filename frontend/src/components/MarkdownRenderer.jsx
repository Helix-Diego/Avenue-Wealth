import React from 'react';

/**
 * Custom High-Performance Notion-Style Markdown Renderer for Financial Agent.
 * Parses headers, bold, italics, tables, callout blocks, lists, and inline tags.
 */
export default function MarkdownRenderer({ content }) {
  if (!content) return null;

  // Split lines
  const rawLines = content.split('\n');
  const elements = [];
  let i = 0;

  const parseInline = (text) => {
    if (!text) return '';
    
    // Bold: **text**
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-neutral-900 dark:text-neutral-100">$1</strong>');
    
    // Inline code: `code`
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 text-[11px] font-mono bg-neutral-150 dark:bg-neutral-800 text-indigo-600 dark:text-indigo-400 rounded">$1</code>');
    
    // Currency highlights (e.g. 1.233,19 € or +2.993,51 €)
    formatted = formatted.replace(/([+-]?\d{1,3}(?:\.\d{3})*(?:,\d{2})?\s*€)/g, '<span class="font-mono tracking-tight">$1</span>');

    return formatted;
  };

  while (i < rawLines.length) {
    const line = rawLines[i];
    const trimmed = line.trim();

    // 1. Table Detection
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines = [];
      while (i < rawLines.length && rawLines[i].trim().startsWith('|') && rawLines[i].trim().endsWith('|')) {
        tableLines.push(rawLines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerRow = tableLines[0].split('|').slice(1, -1).map(c => c.trim());
        // Check if row 1 is a separator (|---|---|)
        const isSeparator = tableLines[1].replace(/[\s|:-]/g, '').length === 0;
        const bodyRows = tableLines.slice(isSeparator ? 2 : 1).map(row => 
          row.split('|').slice(1, -1).map(c => c.trim())
        );

        elements.push(
          <div key={`table-${i}`} className="my-3 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700/80 shadow-2xs">
            <table className="w-full text-left text-[11.5px] border-collapse">
              <thead>
                <tr className="bg-neutral-100/80 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-700">
                  {headerRow.map((col, cIdx) => (
                    <th key={cIdx} className="px-3 py-2 font-semibold text-neutral-700 dark:text-neutral-300">
                      <span dangerouslySetInnerHTML={{ __html: parseInline(col) }} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-150 dark:divide-neutral-800">
                {bodyRows.map((row, rIdx) => (
                  <tr 
                    key={rIdx} 
                    className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors odd:bg-white dark:odd:bg-[#202020] even:bg-neutral-50/40 dark:even:bg-[#242424]"
                  >
                    {row.map((cell, cIdx) => {
                      const isNumeric = /[\d€%]/.test(cell);
                      return (
                        <td 
                          key={cIdx} 
                          className={`px-3 py-2 text-neutral-800 dark:text-neutral-200 ${
                            isNumeric ? 'font-mono' : ''
                          }`}
                        >
                          <span dangerouslySetInnerHTML={{ __html: parseInline(cell) }} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 2. Blockquotes / Callout Badges
    if (trimmed.startsWith('>')) {
      const quoteLines = [];
      while (i < rawLines.length && rawLines[i].trim().startsWith('>')) {
        quoteLines.push(rawLines[i].trim().replace(/^>\s*/, ''));
        i++;
      }

      const quoteText = quoteLines.join(' ');
      let calloutClass = 'bg-neutral-50 dark:bg-neutral-800/40 border-l-4 border-neutral-400 text-neutral-700 dark:text-neutral-300';

      if (quoteText.includes('💡') || quoteText.toLowerCase().includes('recomendación')) {
        calloutClass = 'bg-emerald-50/60 dark:bg-emerald-950/20 border-l-4 border-emerald-500 text-emerald-900 dark:text-emerald-200';
      } else if (quoteText.includes('💼') || quoteText.toLowerCase().includes('empresa') || quoteText.toLowerCase().includes('reembols')) {
        calloutClass = 'bg-sky-50/70 dark:bg-sky-950/20 border-l-4 border-sky-500 text-sky-900 dark:text-sky-200';
      } else if (quoteText.includes('⚠️') || quoteText.includes('🚨') || quoteText.toLowerCase().includes('atención') || quoteText.toLowerCase().includes('leak')) {
        calloutClass = 'bg-amber-50/70 dark:bg-amber-950/20 border-l-4 border-amber-500 text-amber-900 dark:text-amber-200';
      }

      elements.push(
        <div key={`quote-${i}`} className={`my-2.5 p-3 rounded-r-lg text-xs leading-relaxed ${calloutClass}`}>
          <div dangerouslySetInnerHTML={{ __html: parseInline(quoteText) }} />
        </div>
      );
      continue;
    }

    // 3. Headers
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h1 key={`h1-${i}`} className="text-base font-bold text-neutral-900 dark:text-white mt-4 mb-2 pb-1 border-b border-neutral-200 dark:border-neutral-800">
          <span dangerouslySetInnerHTML={{ __html: parseInline(trimmed.replace('# ', '')) }} />
        </h1>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mt-3.5 mb-1.5 flex items-center gap-1.5">
          <span dangerouslySetInnerHTML={{ __html: parseInline(trimmed.replace('## ', '')) }} />
        </h2>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 mt-2.5 mb-1">
          <span dangerouslySetInnerHTML={{ __html: parseInline(trimmed.replace('### ', '')) }} />
        </h3>
      );
      i++;
      continue;
    }

    // 4. Horizontal Rule
    if (trimmed === '---') {
      elements.push(<hr key={`hr-${i}`} className="my-3 border-neutral-200 dark:border-neutral-800" />);
      i++;
      continue;
    }

    // 5. Unordered List Items (- or *)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const itemText = trimmed.substring(2);
      elements.push(
        <div key={`li-${i}`} className="flex items-start space-x-2 my-1 ml-1 text-xs">
          <span className="text-indigo-500 font-bold mt-0.5">•</span>
          <div className="flex-1" dangerouslySetInnerHTML={{ __html: parseInline(itemText) }} />
        </div>
      );
      i++;
      continue;
    }

    // 6. Numbered List Items (e.g. 1. )
    if (/^\d+\.\s/.test(trimmed)) {
      elements.push(
        <div key={`oli-${i}`} className="my-1 ml-1 text-xs pl-2 border-l border-neutral-300 dark:border-neutral-700">
          <div dangerouslySetInnerHTML={{ __html: parseInline(trimmed) }} />
        </div>
      );
      i++;
      continue;
    }

    // 7. Empty line spacing
    if (!trimmed) {
      elements.push(<div key={`sp-${i}`} className="h-1.5" />);
      i++;
      continue;
    }

    // 8. Normal Paragraph
    elements.push(
      <p key={`p-${i}`} className="my-1 text-xs leading-relaxed text-neutral-800 dark:text-neutral-200">
        <span dangerouslySetInnerHTML={{ __html: parseInline(trimmed) }} />
      </p>
    );
    i++;
  }

  return <div className="space-y-0.5">{elements}</div>;
}
