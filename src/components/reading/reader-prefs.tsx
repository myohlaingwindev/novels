"use client";

import { useEffect, useState, type ReactNode } from "react";

type FontSize = "small" | "default" | "large";
type Theme = "light" | "sepia" | "dark";

const fontSizes: FontSize[] = ["small", "default", "large"];

export function readReaderPrefs(read: (key: string) => string | null): {
  fontSize: FontSize;
  theme: Theme;
} {
  const fontSize = read("novels-font-size");
  const theme = read("novels-theme");
  return {
    fontSize: fontSize === "small" || fontSize === "large" ? fontSize : "default",
    theme: theme === "sepia" || theme === "dark" ? theme : "light",
  };
}

export function stepFontSize(current: FontSize, direction: -1 | 1): FontSize {
  const index = fontSizes.indexOf(current);
  const next = index + direction;
  if (next < 0 || next >= fontSizes.length) return current;
  return fontSizes[next];
}

export function ReaderChrome({
  children,
  novelTitle,
  novelSlug,
  chapterPosition,
  chapterCount,
}: {
  children: ReactNode;
  novelTitle: string;
  novelSlug: string;
  chapterPosition: number;
  chapterCount: number;
}) {
  const [fontSize, setFontSize] = useState<FontSize>("default");
  const [theme, setTheme] = useState<Theme>("light");
  const [toolsOpen, setToolsOpen] = useState(false);
  const percent = chapterCount > 0 ? Math.round((chapterPosition / chapterCount) * 100) : 0;

  useEffect(() => {
    const prefs = readReaderPrefs((key) => localStorage.getItem(key));
    setFontSize(prefs.fontSize);
    setTheme(prefs.theme);
  }, []);

  function storeFont(direction: -1 | 1) {
    const next = stepFontSize(fontSize, direction);
    localStorage.setItem("novels-font-size", next);
    setFontSize(next);
  }

  function storeTheme(next: Theme) {
    localStorage.setItem("novels-theme", next);
    setTheme(next);
  }

  const tools = (
    <>
      <div className="reader-sizes" role="group" aria-label="Text size">
        <button type="button" className="icon-button" aria-label="Smaller text" onClick={() => storeFont(-1)}>
          A−
        </button>
        <button type="button" className="icon-button" aria-label="Larger text" onClick={() => storeFont(1)}>
          A+
        </button>
      </div>
      <div className="reader-swatches" role="group" aria-label="Page theme">
        <button
          type="button"
          className="swatch"
          aria-label="Light theme"
          aria-pressed={theme === "light"}
          style={{ background: "#FBF8F3" }}
          onClick={() => storeTheme("light")}
        />
        <button
          type="button"
          className="swatch"
          aria-label="Sepia theme"
          aria-pressed={theme === "sepia"}
          style={{ background: "#EBDDC3" }}
          onClick={() => storeTheme("sepia")}
        />
        <button
          type="button"
          className="swatch"
          aria-label="Dark theme"
          aria-pressed={theme === "dark"}
          style={{ background: "#1F1B16" }}
          onClick={() => storeTheme("dark")}
        />
      </div>
    </>
  );

  return (
    <div className="reader" data-font={fontSize} data-theme={theme}>
      <header className="reader-bar">
        <div className="reader-bar-row">
          <a className="reader-back" href={`/novels/${novelSlug}`}>
            <span aria-hidden="true">←</span>
            <span className="reader-back-title">{novelTitle}</span>
          </a>
          <div className="reader-position">
            Chapter {chapterPosition} of {chapterCount}
          </div>
          <div className="reader-desktop-tools">{tools}</div>
          <div className="reader-mobile-tools">
            <button
              type="button"
              className="icon-button"
              aria-label="Text and theme settings"
              aria-expanded={toolsOpen}
              onClick={() => setToolsOpen((open) => !open)}
            >
              Aa
            </button>
          </div>
          <a className="icon-button" href={`/novels/${novelSlug}`} aria-label="Chapter list">
            ≡
          </a>
        </div>
        {toolsOpen ? <div className="reader-tool-panel">{tools}</div> : null}
        <div
          className="reader-progress"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Book progress"
        >
          <div style={{ width: `${percent}%` }} />
        </div>
      </header>
      <div className="reader-column">
        <div className="chapter-kicker">Chapter {chapterPosition}</div>
        {children}
      </div>
    </div>
  );
}
