import "./globals.css";

export const metadata = {
  title: "국내 시장 대시보드",
  description: "예시 데이터로 보는 국내 주식시장 분위기 대시보드",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
