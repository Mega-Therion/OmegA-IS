import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OmegA Public Interface",
  description: "Public access point for OmegA Sovereign Intelligence",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
