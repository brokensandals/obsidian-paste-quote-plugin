export interface Quote {
  raw: string,
  body: string,
  title?: string,
  authors?: string[],
  page?: string,
}

export interface CslAuthor {
  family?: string,
  given?: string,
}

export interface CslReference {
  id: string,
  title?: string,
  author?: CslAuthor[],
  editor?: CslAuthor[],
  issued?: CslDate[],
}

export interface CslDate {
  year?: number,
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
          // If there's a page number, citationParts[1] looks like "Title (p"; if there's not, it looks like "Title (Function)".
          // (Right now I literally see "(Function)" every time I copy a quote. I assume this is a bug in the Kindle app and it's supposed to contain the publisher or something.)
          // The following is meant to trim the unnecessary stuff off the end while still allowing titles with parentheses.
          result.title = citationParts[1].replace(/\s*\([^(]*$/, '').trim();
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

// Replaces double quote marks within a quotation with single quotes, so they won't be confused with the quote marks surrounding the quotation.
// Ideally we'd replace single quote marks within the quotation too, to fit the pattern of single-double-single-... nesting, but that's more complicated, especially since we'd have to distinguish apostrophes too.
export function replaceDoubleQuotes(original: string): string {
  return original
    .replace(/"/g, "'")
    .replace(/“/g, "‘")
    .replace(/”/g, "’");
}

function searchableTitle(title: string): string {
  return title.toLowerCase().replace(/[.:,()-\u002d\u2010\u2011\u2012\u2013\u2014\u2015\ufe58\ufe63\uff0d]/gu, '').replace(/\s+/g, ' ').trim();
}

export function guessCiteId(title: string, refs: CslReference[]): string | null {
  const st = searchableTitle(title);
  return refs.find((ref) => searchableTitle(ref.title || "") === st)?.id || null;
}

export function cslReferenceSummary(ref: CslReference): string {
  let authors = [...(ref.editor || []), ...(ref.author || [])];
  authors = authors.slice(0, 4);
  let authorString = authors.map(a => a.family || a.given).join(' ');
  let dateString = (ref.issued && ref.issued.length > 0 && ref.issued[0].year) ? ref.issued[0].year : '';
  let titleString = ref.title || '';
  return [authorString, dateString, titleString].join(' ');
}
