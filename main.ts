import { App, Editor, MarkdownView, Plugin, PluginSettingTab, TFile } from 'obsidian';
import { CslReference, parseQuote, replaceDoubleQuotes, scoreRefMatches } from 'src/quotes';

// Remember to rename these classes and interfaces!

interface PasteQuotePluginSettings {
	
}

const DEFAULT_SETTINGS: PasteQuotePluginSettings = {
	
}

export default class PasteQuotePlugin extends Plugin {
	settings: PasteQuotePluginSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'paste-quote',
			name: 'Paste quote',
			editorCallback: this.pasteQuote.bind(this),
		});

		this.addSettingTab(new PasteQuoteSettingTab(this.app, this));
	}

	async pasteQuote(editor: Editor, view: MarkdownView) {
		const clipboardText = await navigator.clipboard.readText();
		const quote = parseQuote(clipboardText);

		const cursorPosition = editor.getCursor();
		const formattedQuote = this.formatQuote(quote.body, cursorPosition);
		const citation = this.citationForQuote(quote, view.file);

		editor.replaceRange(`${formattedQuote}${citation}`, cursorPosition);
	}

	formatQuote(quote: string, cursorPosition: CodeMirror.Position) {
    return cursorPosition.ch === 0 
      ? `> ${quote}` 
      : `“${replaceDoubleQuotes(quote)}”`;
  }

	citationForQuote(quote: Quote, file?: TFile): string {
		if (!(quote.title || quote.authors || quote.page)) {
			return "";
		}

		const fileCache = this.app.metadataCache.getFileCache(file);
		const refs = fileCache?.frontmatter?.references || [];
		if (refs.length == 0) {
			// TODO make this configurable
			return ` (*${quote.title}*, p. ${quote.page})`;
		}

		const id = this.citeIdForQuote(quote, refs) || `TODO ${quote.title}`;
		let citation = `[@${id}`;
		if (quote.page) {
			citation += ', p. ' + quote.page;
		}
		citation += ']';
		return citation;
	}

	citeIdForQuote(quote: Quote, refs: CslReference[]): string | null {
		const results = scoreRefMatches(quote, refs);
		if (results.length == 0) {
			return null;
		}
		
		return results[0].id;
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class PasteQuoteSettingTab extends PluginSettingTab {
	plugin: PasteQuotePlugin;

	constructor(app: App, plugin: PasteQuotePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();
	}
}
