export interface Quote {
  raw: string,
  body: string,
  title?: string,
  authors?: string[],
  page?: string,
}

export function parseQuote(raw: string): Quote {
  const result: Quote = {
    raw: raw,
    body: raw
  };

  // Look for Kindle quote pattern - text followed by metadata on separate lines
  const lines = raw.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  if (lines.length >= 2) {
    const lastLine = lines[lines.length - 1];
    
    // Check if last line matches Kindle citation format
    if (lastLine.includes('Kindle Edition')) {
      // Extract body (all lines except last)
      result.body = lines.slice(0, -1).join('\n').trim();
      
      // Parse citation line
      const citationParts = lastLine.split('.');
      
      // Extract authors and title
      if (citationParts.length >= 2) {
        const authorPart = citationParts[0];
        const authors = authorPart.split(';').map(a => a.trim());
        result.authors = authors;
        
        if (citationParts.length >= 2) {
          result.title = citationParts[1].trim();
        }
      }
      
      // Extract page number if present
      const pageMatch = lastLine.match(/\(pp?\. ([^)]+)\)/);
      if (pageMatch) {
        result.page = pageMatch[1];
      }
    }
  }

  return result;
}
