import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "streamdown/styles.css";
import { SITE_DESC, SITE_NAME, SITE_URL } from "@/lib/site";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jb = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jb" });

const title = "Talk With Reze!";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: title, template: `%s | ${SITE_NAME}` },
  description: SITE_DESC,
  applicationName: SITE_NAME,
  authors: [{ name: "Rzfan03", url: "https://github.com/Rzfan03" }],
  creator: "Rzfan03",
  publisher: "Rzfan03",
  category: "technology",
  keywords: [
    "Talk With Reze",
    "chat suara AI",
    "AI voice chat",
    "chat AI bahasa Indonesia",
    "avatar AI",
    "Reze",
    "ElevenLabs",
    "text to speech Indonesia",
    "speech to text",
    "Next.js AI chat",
  ],
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon-32.png",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  formatDetection: { email: false, address: false, telephone: false },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "/",
    siteName: SITE_NAME,
    title,
    description: SITE_DESC,
    images: [
      {
        url: "/og-image.jpg",
        width: 1280,
        height: 720,
        alt: "Avatar Reze — Talk With Reze, chat suara AI",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: SITE_DESC,
    images: [{ url: "/og-image.jpg", alt: "Avatar Reze — Talk With Reze" }],
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0b",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESC,
  image: `${SITE_URL}/og-image.jpg`,
  applicationCategory: "EntertainmentApplication",
  operatingSystem: "Web",
  inLanguage: "id-ID",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "IDR" },
  author: { "@type": "Person", name: "Rzfan03", url: "https://github.com/Rzfan03" },
  codeRepository: "https://github.com/Rzfan03/talk-with-reze",
  featureList: [
    "Chat suara dengan mikrofon",
    "Balasan suara ElevenLabs",
    "Avatar yang bergerak mengikuti audio",
    "Riwayat percakapan lokal",
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${inter.variable} ${jb.variable}`}>
      <body className="font-sans">
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
