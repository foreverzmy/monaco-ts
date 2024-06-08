import type Monaco from 'monaco-editor';
import { convertTheme, getBase } from './utils';
import atomDark from './atom-dark.json';
import atomLight from './atom-light.json';
import cl from './codesandbox-light.json';
import codesandbox from './codesandbox.json';
import noctis from './noctis.json';

const defaultTheme = convertTheme(noctis);
const MonacoBuiltinTheme = ['vs', 'vs-dark', 'hc-light', 'hc-black'];
const MonacoBuiltinThemeBackground: Record<string, string> = {
	'vs': '#FFFFFF',
	'vs-dark': '#1E1E1E',
	'hc-black': '#000000',
	'hc-light': '#FFFFFF',
}

const themes: Record<string, any> = {
	'atom-dark': convertTheme(atomDark),
	'atom-light': convertTheme(atomLight),
	'codesandbox-light': convertTheme(cl),
	codesandbox: convertTheme(codesandbox),
	noctis: convertTheme(noctis),
};

export const setTheme = (monaco: typeof Monaco, themeName: string) => {
	if (MonacoBuiltinTheme.includes(themeName)) {
    document.body.style.background = MonacoBuiltinThemeBackground[themeName];
    monaco.editor.setTheme(themeName);
	} else if (Boolean(themeName) && monaco.editor.defineTheme) {
		const transformedTheme = themes[themeName] ?? defaultTheme;
		const base = getBase(transformedTheme.type);
		const background = transformedTheme.colors['editor.background'] || MonacoBuiltinThemeBackground[base];
		const border = transformedTheme.colors['editorGroup.border'];

		document.body.style.background = background;
		const actionEl = document.getElementsByClassName('actions')[0] as HTMLDivElement;
		actionEl.style.borderBottomColor = border;

		try {
			monaco.editor.defineTheme(themeName, {
				base: base,
				inherit: true,
				colors: transformedTheme.colors,
				rules: transformedTheme.rules,
			});

			monaco.editor.setTheme(themeName);
		} catch (e) {
			console.error(e);
		}
	}
};
