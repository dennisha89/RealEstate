import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RealEstate Intelligence — AI-Powered Investment Analysis",
  description:
    "Analyze any property in seconds. AI-powered deal grades, financial projections, risk assessments, and market intelligence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
