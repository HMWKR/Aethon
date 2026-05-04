import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AETHON Studio",
  description: "AI-native video editing studio for responsible creative decisions.",
  icons: {
    icon: "/icon.svg"
  }
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
