import "./globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";
import { themeInitializationScript } from "@/lib/theme";

export const metadata = {
  title: "오늘의 국내 시장",
  description: "국내 주식시장의 흐름을 한눈에 확인하는 대시보드",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitializationScript }} />
      </head>
      <body>
        <header className="site-toolbar">
          <div className="site-toolbar-inner">
            <ThemeToggle />
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
