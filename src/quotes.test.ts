import { parseQuote, replaceDoubleQuotes, scoreRefMatches } from './quotes';

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

describe('scoreRefMatches', () => {
  const references = [
    {
      "id": "sidgwick1981",
      "author": [
        {
          "family": "Sidgwick",
          "given": "Henry"
        }
      ],
      "title": "The methods of ethics",
    },
    {
      "id": "edmondsParfitPhilosopherHis2023",
      "ISBN": "978-0-691-22525-8",
      "author": [
        {
          "family": "Edmonds",
          "given": "David"
        }
      ],
      "title": "Parfit: a philosopher and his mission to save morality",
    },
    {
      "id": "stillman2010",
      "author": [
        {
          "family": "Stillman",
          "given": "Tyler F."
        },
        {
          "family": "Baumeister",
          "given": "Roy F."
        }
      ],
      "title": "Guilty, free, and wise: Determinism and psychopathy diminish learning from negative emotions",
    }
  ];

  it('should find a close match', () => {
    let quote = {raw: "irrelevant", body: "irrelevant", title: "Parfit", authors: ["Edmonds, David"]};
    let results = scoreRefMatches(quote, references);
    expect(results[0].id).toBe("edmondsParfitPhilosopherHis2023");
    expect(results[0].score).toBeGreaterThan(0.5);

    quote = {raw: "irrelevant", body: "irrelevant", title: "Methods of Ethics", authors: ["sidgwick, henry"]};
    results = scoreRefMatches(quote, references);
    expect(results[0].id).toBe("sidgwick1981");
    expect(results[0].score).toBeGreaterThan(0.5);
  });

  it('should find a close title-only match', () => {
    const quote = {raw: "irrelevant", body: "irrelevant", title: "Methods of Ethics"};
    const results = scoreRefMatches(quote, references);
    expect(results[0].id).toBe("sidgwick1981");
    expect(results[0].score).toBeGreaterThan(0.5);
  });

  it('sometimes matches stuff it probably should not', () => {
    // I'm including this test to illustrate how this sort of fuzzy matching isn't perfect for this use case—but I still think it's probably good enough
    const quote = {raw: "irrelevant", body: "irrelevant", title: "Parfit"};
    const results = scoreRefMatches(quote, references);
    expect(results[0].id).toBe("edmondsParfitPhilosopherHis2023");
  });

  it('should find a partial title and author match', () => {
    const quote = {raw: "irrelevant", body: "irrelevant", title: "guilty free wise", authors: ["baumeister"]};
    const results = scoreRefMatches(quote, references);
    expect(results[0].id).toBe("stillman2010");
    expect(results[0].score).toBeGreaterThan(0.5);
  });

  it('should not find a match based solely on authors', () => {
    const quote = {raw: "irrelevant", body: "irrelevant", authors: ["Baumeister, Roy F.", "Stillman, Tyler F."]};
    const results = scoreRefMatches(quote, references);
    expect(results.length).toBe(0);
  });

  it('should not find a very loose match', () => {
    const quote = {raw: "irrelevant", body: "irrelevant", title: "psychopathy", authors: ["Baumeister, Franklin"]};
    const results = scoreRefMatches(quote, references);
    expect(results.length).toBe(0);
  });
});
