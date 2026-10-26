import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { APP_NAME, APP_TAGLINE } from "@/lib/config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: APP_TAGLINE,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Anti-flash : applique le thème avant le premier rendu.
            Les formulaires publics (/form/*) restent toujours clairs. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{if(location.pathname.indexOf('/form/')===0)return;if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}})()",
          }}
        />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
