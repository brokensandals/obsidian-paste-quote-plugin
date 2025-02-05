import { Editor, MarkdownView, Plugin, TFile } from 'obsidian';
import { parseQuote, Quote, replaceDoubleQuotes, guessCiteId } from 'src/quotes';

export default class PasteQuotePlugin extends Plugin {
	async onload() {
		this.addCommand({
			id: 'paste-quote',
			name: 'Paste quote',
			editorCallback: this.pasteQuote.bind(this),
		});
	}

	async pasteQuote(editor: Editor, view: MarkdownView) {
		const clipboardText = await navigator.clipboard.readText();
		const quote = parseQuote(clipboardText);

		const cursorPosition = editor.getCursor();
		const formattedQuote = this.formatQuote(quote.body, cursorPosition);
		const citation = this.citationForQuote(quote, view.file);
		const insert = `${formattedQuote}${citation}`;

		editor.replaceRange(insert, cursorPosition);
		editor.setCursor(editor.offsetToPos(editor.posToOffset(cursorPosition) + insert.length));
	}

	formatQuote(quote: string, cursorPosition: CodeMirror.Position) {
    return cursorPosition.ch === 0 
      ? `> ${quote}` 
      : `“${replaceDoubleQuotes(quote)}”`;
  }

	citationForQuote(quote: Quote, file: TFile | null): string {
		if (!(quote.title || quote.page)) {
			return "";
		}

		if (!quote.title) {
			// TODO make this configurable
			return `(p. ${quote.page})`;
		}

		const fileCache = file == null ? null : this.app.metadataCache.getFileCache(file);
		const refs = fileCache?.frontmatter?.references || [];
		if (refs.length == 0) {
			// TODO make this configurable
			let citation = ` (*${quote.title}*`;
			if (quote.page) {
				citation += `, p. ${quote.page}`;
			}
			citation += ')';
			return citation;
		}

		const id = guessCiteId(quote.title, refs) || `TODO ${quote.title}`;
		let citation = `[@${id}`;
		if (quote.page) {
			citation += ', p. ' + quote.page;
		}
		citation += ']';
		return citation;
	}

	onunload() {

	}
}
