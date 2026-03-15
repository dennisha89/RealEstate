import type { Metadata, Viewport } from "next";
import Providers from "./providers";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Xuan (\u7384) \u2014 The Profound",
  description:
    "Read the forces that shape where wealth gathers.",
  applicationName: "Xuan",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Xuan",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <script
          dangerouslySetInnerHTML={{
            __html:
              'if("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js")',
          }}
        />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
