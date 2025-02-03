import { App, Editor, MarkdownView, Plugin, PluginSettingTab } from 'obsidian';
import { parseQuote, Quote, replaceDoubleQuotes } from 'src/quotes';

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

		editor.replaceRange(formattedQuote, cursorPosition);
	}

	formatQuote(quote: string, cursorPosition: CodeMirror.Position) {
    return cursorPosition.ch === 0 
      ? `> ${quote}` 
      : `“${replaceDoubleQuotes(quote)}”`;
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
