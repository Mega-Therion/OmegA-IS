import "./globals.css";
import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/lib/AuthContext";

// SEO Metadata
export const metadata: Metadata = {
  title: {
    default: "JARVIS Neuro-Link | AI Command Interface",
    template: "%s | JARVIS",
  },
  description:
    "Next-generation neuro-link interface with RAG-augmented reasoning, persistent memory, and multi-agent orchestration. Command your AI collective.",
  keywords: [
    "AI",
    "neuro-link",
    "RAG",
    "memory",
    "agents",
    "collective intelligence",
    "voice control",
  ],
  authors: [{ name: "gAIng Collective" }],
  creator: "gAIng Collective",
  publisher: "gAIng Collective",

  // Open Graph
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://jarvis.gaing-brain.io",
    siteName: "JARVIS Neuro-Link",
    title: "JARVIS Neuro-Link | AI Command Interface",
    description:
      "Next-generation neuro-link interface with RAG-augmented reasoning and multi-agent orchestration.",
    images: [
      {
        url: "/og-jarvis.png",
        width: 1200,
        height: 630,
        alt: "JARVIS Neuro-Link Command Interface",
      },
    ],
  },

  // Twitter
  twitter: {
    card: "summary_large_image",
    title: "JARVIS Neuro-Link",
    description: "AI Command Interface with RAG and Memory",
    images: ["/og-jarvis.png"],
  },

  // PWA & Icons
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },

  // App
  applicationName: "JARVIS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "JARVIS",
  },

  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

// Viewport configuration
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0a0a1a" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a1a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {/* Skip to content for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-cyan-500 focus:text-black focus:rounded"
        >
          Skip to content
        </a>
        <main id="main-content">
          <AuthProvider>{children}</AuthProvider>
        </main>
      </body>
    </html>
  );
}
