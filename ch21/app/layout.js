import "./globals.css";
import ThemeToggle from "./ThemeToggle.js";
import { createThemeInitializerScript } from "../lib/themePreference.js";

export const metadata = {
  title: "국내 시장 대시보드",
  description: "공공데이터포털 데이터로 보는 국내 주식시장 분위기 대시보드",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script
          id="theme-initializer"
          dangerouslySetInnerHTML={{ __html: createThemeInitializerScript() }}
        />
      </head>
      <body>
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
