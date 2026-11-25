"use client";

import { useEffect, useState, type ReactNode } from "react";

type FontSize = "small" | "default" | "large";
type Theme = "light" | "sepia" | "dark";

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

export function ReaderChrome({ children }: { children: ReactNode }) {
  const [fontSize, setFontSize] = useState<FontSize>("default");
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const prefs = readReaderPrefs((key) => localStorage.getItem(key));
    setFontSize(prefs.fontSize);
    setTheme(prefs.theme);
  }, []);

  return (
    <div className="reader" data-font={fontSize} data-theme={theme}>
      <label htmlFor="reader-font-size">Font size</label>
      <select
        id="reader-font-size"
        value={fontSize}
        onChange={(event) => {
          const value = event.target.value;
          if (value !== "small" && value !== "default" && value !== "large") return;
          localStorage.setItem("novels-font-size", value);
          setFontSize(value);
        }}
      >
        <option value="small">small</option>
        <option value="default">default</option>
        <option value="large">large</option>
      </select>
      <label htmlFor="reader-theme">Theme</label>
      <select
        id="reader-theme"
        value={theme}
        onChange={(event) => {
          const value = event.target.value;
          if (value !== "light" && value !== "sepia" && value !== "dark") return;
          localStorage.setItem("novels-theme", value);
          setTheme(value);
        }}
      >
        <option value="light">light</option>
        <option value="sepia">sepia</option>
        <option value="dark">dark</option>
      </select>
      {children}
    </div>
  );
}
