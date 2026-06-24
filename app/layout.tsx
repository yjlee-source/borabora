import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BoraBora BRG",
  description: "Personal hotel BRG search dashboard"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
