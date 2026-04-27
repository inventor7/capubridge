export interface FormattedSegment {
  text: string;
  style: string;
}

const CSS_START_RE = new RegExp(
  `^(.*?)\\s+((?:color|font-weight|font-style|background|background-color|text-decoration|opacity|border|padding|margin|font-size|font-family)\\s*:.+)$`,
  "s",
);

function luminance(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function parseRgb(s: string): [number, number, number] | null {
  const hex = s.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (h.length >= 6) {
      return [
        parseInt(h.slice(0, 2), 16),
        parseInt(h.slice(2, 4), 16),
        parseInt(h.slice(4, 6), 16),
      ];
    }
  }
  const rgb = s.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgb) return [+rgb[1], +rgb[2], +rgb[3]];
  return null;
}

function isDarkOnDarkTheme(colorValue: string): boolean {
  const parsed = parseRgb(colorValue.trim());
  if (!parsed) return false;
  return luminance(...parsed) < 0.2;
}

function extractSafeStyle(css: string): string {
  const parts: string[] = [];

  const fw = css.match(/\bfont-weight\s*:\s*([^;]+)/);
  if (fw) parts.push(`font-weight: ${fw[1].trim()}`);

  const fi = css.match(/\bfont-style\s*:\s*([^;]+)/);
  if (fi) parts.push(`font-style: ${fi[1].trim()}`);

  const td = css.match(/\btext-decoration\s*:\s*([^;]+)/);
  if (td) parts.push(`text-decoration: ${td[1].trim()}`);

  const colorMatch = css.match(/(?:^|;)\s*color\s*:\s*([^;]+)/);
  if (colorMatch) {
    const c = colorMatch[1].trim();
    if (!isDarkOnDarkTheme(c)) {
      parts.push(`color: ${c}`);
    }
  }

  return parts.join("; ");
}

function splitCssArgs(cssText: string): string[] {
  const parts: string[] = [];
  let last = 0;
  const re = /(?<=[^;])\s+(?=[a-z][\w-]*\s*:)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cssText)) !== null) {
    parts.push(cssText.slice(last, m.index).trim());
    last = m.index + m[0].length;
  }
  parts.push(cssText.slice(last).trim());
  return parts.filter(Boolean);
}

export function parseConsoleFormat(text: string): FormattedSegment[] {
  if (!text.includes("%c")) {
    return [{ text, style: "" }];
  }

  const parts = text.split("%c");
  const lastPart = parts[parts.length - 1];

  let lastDisplay = lastPart;
  let cssText = "";

  const m = lastPart.match(CSS_START_RE);
  if (m) {
    lastDisplay = m[1];
    cssText = m[2];
  }

  const cssArgs = cssText ? splitCssArgs(cssText) : [];

  const segments: FormattedSegment[] = [];

  if (parts[0]) {
    segments.push({ text: parts[0], style: "" });
  }

  for (let i = 1; i < parts.length; i++) {
    const isLast = i === parts.length - 1;
    const display = isLast ? lastDisplay : parts[i];
    const style = extractSafeStyle(cssArgs[i - 1] ?? "");
    segments.push({ text: display, style });
  }

  return segments;
}
