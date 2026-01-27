
import React from 'react';

// Renders markdown for lists, tables, and bold text.
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    
    // Pre-process content to remove LaTeX artifacts that models sometimes output
    // e.g., $\\$530$ -> $530, \text{mt} -> mt, \% -> %
    const cleanContent = content
        .replace(/\\text\{([^}]+)\}/g, '$1') // Remove \text{word} keeping 'word'
        .replace(/\\([$%])/g, '$1')          // Remove backslash before $ or %
        .replace(/\$([^$]+)\$/g, '$1');      // Remove wrapping $...$ math delimiters

    // Helper to parse inline markdown like **bold** text.
    const parseInline = (text: string) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index}>{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    // Split content into blocks by empty lines. This helps group paragraphs.
    const blocks = cleanContent.split(/(\n\s*\n)/g);
    const elements: React.ReactNode[] = [];

    blocks.forEach((block, index) => {
        if (!block.trim()) return; // Skip empty blocks from splitting

        const lines = block.trim().split('\n');
        
        // Check for Table
        const isTable = lines.length > 1 && lines[0].includes('|') && lines[1].includes('---');
        if (isTable) {
            const headerLine = lines[0];
            const bodyLines = lines.slice(2);
            const headers = headerLine.split('|').map(h => h.trim()).filter(Boolean);
            const bodyRows = bodyLines.map(row => row.split('|').map(c => c.trim()).filter(Boolean));

            elements.push(
                <div key={index} className="my-2 w-full overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="border-b-2 border-slate-300">
                                {headers.map((header, hIndex) => (
                                    <th key={hIndex} className="p-2 font-bold text-slate-600">{parseInline(header)}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {bodyRows.map((row, rIndex) => (
                                <tr key={rIndex} className="border-b border-slate-200">
                                    {row.map((cell, cIndex) => (
                                        <td key={cIndex} className="p-2 text-slate-700">{parseInline(cell)}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
            return;
        }

        // Check for List
        const isUnordered = lines[0].trim().startsWith('* ') || lines[0].trim().startsWith('- ');
        const isOrdered = /^\d+\.\s/.test(lines[0].trim());
        if(isUnordered || isOrdered) {
            const ListTag = isOrdered ? 'ol' : 'ul';
            const listClass = isOrdered ? 'list-decimal' : 'list-disc';
            elements.push(
                <ListTag key={index} className={`my-2 space-y-1 pl-5 ${listClass}`}>
                    {lines.map((line, lIndex) => {
                        const itemContent = line.replace(/^(\* |-\s|\d+\.\s)/, '').trim();
                        return <li key={lIndex}>{parseInline(itemContent)}</li>;
                    })}
                </ListTag>
            );
            return;
        }

        // Default to Paragraph, handling multi-line paragraphs with <br>
        elements.push(
            <p key={index} className="my-1">
                {lines.map((line, pIndex) => (
                    <React.Fragment key={pIndex}>
                        {parseInline(line)}
                        {pIndex < lines.length - 1 && <br />}
                    </React.Fragment>
                ))}
            </p>
        );
    });

    return <>{elements}</>;
};

export default MarkdownRenderer;
