import { Editor, MarkdownView, Plugin, TFile, parseYaml, Notice, FuzzySuggestModal, App, FuzzyMatch } from 'obsidian';
import { parseQuote, Quote, replaceDoubleQuotes, guessCiteId, CslReference, cslReferenceSummary } from 'src/quotes';

export default class PasteQuotePlugin extends Plugin {
	async onload() {
		this.addCommand({
			id: 'paste-quote',
			name: 'Paste quote',
			editorCallback: this.pasteQuote.bind(this),
		});

		this.addCommand({
			id: 'paste-csl-yaml',
			name: 'Paste CSL YAML',
			editorCallback: this.pasteCslYaml.bind(this),
		});

		this.addCommand({
			id: 'cite-reference',
			name: 'Cite reference',
			editorCallback: this.citeReference.bind(this),
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

	async pasteCslYaml(editor: Editor, view: MarkdownView) {
		if (!view.file) {
			return;
		}

		const clipboardText = await navigator.clipboard.readText();
		if (!clipboardText) {
			new Notice('Paste CSL YAML failed: there is no text on the clipboard');
			return;
		}

		let data;
		try {
			data = parseYaml(clipboardText);
		} catch (err) {
			new Notice("Paste CSL YAML failed: could not parse clipboard text as YAML");
			return;
		}

		let references: CslReference[];
		if (Array.isArray(data.references) && data.references.length > 0 && data.references[0].id) {
			references = data.references;
		} else if (Array.isArray(data) && data.length > 0 && data[0].id) {
			references = data;
		} else if (data.id) {
			references = [data];
		} else {
			new Notice("Paste CSL YAML failed: clipboard content does not look like CSL (expected object(s) with 'id' keys, optionally under a 'references' key)")
			return;
		}

		await this.app.fileManager.processFrontMatter(view.file, (frontmatter) => {
			if (frontmatter.references === undefined || frontmatter.references === null) {
				frontmatter.references = [];
			}
			if (!Array.isArray(frontmatter.references)) {
				new Notice("Paste CSL YAML failed: there is an existing 'references' field, but it is not an array");
			}

			const oldIds = new Set((frontmatter.references || []).map((ref: CslReference) => ref.id));
			const skipped = [];

			for (const ref of references) {
				if (oldIds.has(ref.id)) {
					skipped.push(ref.id);
					oldIds.add(ref.id); // in case there are duplicates within the pasted yaml
				} else {
					frontmatter.references.push(ref);
				}
			}

			if (skipped.length > 0) {
				new Notice(`Paste CSL YAML skipped ${skipped.length} items because their IDs were already present`);
			}
		});
	}

	async citeReference(editor: Editor, view: MarkdownView) {
		if (!view.file) {
			return;
		}

		const fileCache = this.app.metadataCache.getFileCache(view.file);
		const references = fileCache?.frontmatter?.references || [];

		if (!references || references.length === 0) {
			new Notice('Cite Reference failed: no references found in front matter');
			return;
		}

		const modal = new ReferenceSuggestModal(this.app, references, (citeId) => {
			const citation = `[@${citeId}]`;
			const cursorPosition = editor.getCursor();
			editor.replaceRange(citation, cursorPosition);
			// move cursor to just before the closing bracket
			editor.setCursor(editor.offsetToPos(editor.posToOffset(cursorPosition) + citation.length - 1));
		});

		modal.open();
	}

	onunload() {

	}
}

interface SearchableReference {
	id: string,
	text: string,
}

class ReferenceSuggestModal extends FuzzySuggestModal<SearchableReference> {
	private references: CslReference[];
	private onChooseReference: (id: string) => void;

	constructor(app: App, references: CslReference[], onChooseReference: (id: string) => void) {
		super(app);
		this.references = references;
		this.onChooseReference = onChooseReference;
	}

	getItemText(item: SearchableReference): string {
		return item.text;
	}

	getItems(): SearchableReference[] {
		return this.references.map(r => ({id: r.id, text: cslReferenceSummary(r)}));
	}

	onChooseItem(item: SearchableReference, evt: MouseEvent | KeyboardEvent): void {
		this.onChooseReference(item.id);
	}
}
