import type Monaco from 'monaco-editor';

const colorsAllowed = ({ foreground, background }: Record<string, string>) => {
  if (foreground === 'inherit' || background === 'inherit') {
    return false;
  }

  return true;
};

export const convertTheme = (theme: Record<string, any>) => {
  const { tokenColors = [], colors = {} } = theme;
  const rules = tokenColors
    .filter((t: any) => t.settings && t.scope && colorsAllowed(t.settings))
    .reduce((acc: any[], token: any) => {
      const settings = {
        foreground: token.settings.foreground,
        background: token.settings.background,
        fontStyle: token.settings.fontStyle,
      };

      const scope: string[] =
        typeof token.scope === 'string'
          ? token.scope.split(',').map((a: string) => a.trim())
          : token.scope;

      scope.map(s =>
        acc.push({
          token: s,
          ...settings,
        })
      );

      return acc;
    }, []);

  const newColors = colors;
  Object.keys(colors).forEach(c => {
    if (newColors[c]) return c;

    delete newColors[c];

    return c;
  });

  return {
    colors: newColors,
    rules,
    type: theme.type,
  } as {
    rules: Monaco.editor.ITokenThemeRule[];
    type: string;
    colors: Monaco.editor.IColors;
  };
};

export const getBase = (type: string) => {
  if (type === 'dark') {
    return 'vs-dark';
  }

  if (type === 'hc') {
    return 'hc-black';
  }

  return 'vs';
};