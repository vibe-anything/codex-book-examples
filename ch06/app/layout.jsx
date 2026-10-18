import './globals.css';

export const metadata = {
  title: '실거래가 조회',
  description: '서울 강남구 아파트 매매 실거래가 조회'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
