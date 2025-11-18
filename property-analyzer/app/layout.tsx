import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Property Analyzer - AI-Powered Real Estate Analysis",
  description: "Analyze any property in 60 seconds. Get instant buy/pass recommendations with AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
