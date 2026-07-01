import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DMS Console",
  description: "Development Management System console"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
