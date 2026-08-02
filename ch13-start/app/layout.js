import "./globals.css";

export const metadata = {
  title: "오늘의 국내 시장",
  description: "국내 주식시장의 흐름을 한눈에 확인하는 대시보드",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
