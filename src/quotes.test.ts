import { parseQuote, replaceDoubleQuotes } from './quotes';

describe('parseQuote', () => {
  it('should fall back to using the raw clipboard contents if it cannot parse the quote', () => {
    const raw = 'This is a simple quote';
    const result = parseQuote(raw);
    expect(result).toEqual({
      raw: raw,
      body: raw
    });
  });

  it('should parse Kindle format quotes', () => {
    const raw = 'We think these are our own thoughts, but they are not. They are like frozen-dinner thoughts. We buy them already made and then heat them up in our brains a little and then think them. As if they are our own. As if thoughts didn’t take any effort.\n\nO\'Neill, Heather. Daydreams of Angels: Stories (p. 56). (Function). Kindle Edition. ';
    const result = parseQuote(raw);
    expect(result).toEqual({
      raw: raw,
      body: 'We think these are our own thoughts, but they are not. They are like frozen-dinner thoughts. We buy them already made and then heat them up in our brains a little and then think them. As if they are our own. As if thoughts didn’t take any effort.',
      authors: ['O\'Neill, Heather'],
      title: 'Daydreams of Angels: Stories',
      page: '56'
    });
  });

  it('should handle quotes with multiple lines of content', () => {
    const raw = 'First line\nSecond line\nThird line\nSmith, John. Some Book (p. 123). Kindle Edition';
    const result = parseQuote(raw);
    expect(result).toEqual({
      raw: raw,
      body: 'First line\nSecond line\nThird line',
      authors: ['Smith, John'],
      title: 'Some Book',
      page: '123'
    });
  });

  it('should handle missing page numbers', () => {
    const raw = 'Like my cat, I often simply do what I want to do.\n\nParfit, Derek. Reasons and Persons (Function). Kindle Edition. ';
    const result = parseQuote(raw);
    expect(result).toEqual({
      raw: raw,
      body: 'Like my cat, I often simply do what I want to do.',
      authors: ['Parfit, Derek'],
      title: 'Reasons and Persons'
    });
  });

  it('should handle titles with parentheses and page number', () => {
    const raw = 'Good stuff.\n\nBody, Some. An (Un-)Amazing Book (p. 12345). (Function). Kindle Edition.';
    const result = parseQuote(raw);
    expect(result).toEqual({
      raw: raw,
      body: 'Good stuff.',
      authors: ['Body, Some'],
      title: 'An (Un-)Amazing Book',
      page: '12345'
    });
  });

  it('should handle titles with parenthese and no page number', () => {
    const raw = 'Good stuff.\n\nBody, Some. An (Un-)Amazing Book (Function). Kindle Edition.';
    const result = parseQuote(raw);
    expect(result).toEqual({
      raw: raw,
      body: 'Good stuff.',
      authors: ['Body, Some'],
      title: 'An (Un-)Amazing Book'
    });
  });
});

describe('replaceDoubleQuotes', () => {
  it('should replace directional double quotes', () => {
    const original = '“It’s one of those smart gels,” Ray said at last. “Smart gels?” “Head cheese. Cultured brain cells on a slab.';
    const expected = "‘It’s one of those smart gels,’ Ray said at last. ‘Smart gels?’ ‘Head cheese. Cultured brain cells on a slab.";
    expect(replaceDoubleQuotes(original)).toBe(expected);
  });

  it('should replace nondirectional double quotes', () => {
    const original = '"Don\'t @ me"';
    const expected = "'Don't @ me'";
    expect(replaceDoubleQuotes(original)).toBe(expected);
  });
});
