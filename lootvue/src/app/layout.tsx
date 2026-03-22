import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "LootVue — Real Estate Intelligence",
  description: "Institutional-grade real estate analytics. 12 engines. One verdict.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read locale and messages from src/i18n/request.ts (cookie-based).
  // Falls back to 'en' if no cookie is set.
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className="dark">
      <body className="min-h-screen">
        {/*
          NextIntlClientProvider bridges the server-resolved locale and
          messages to client components using useTranslations().
          Existing client components using useTranslation() (Zustand)
          continue to work independently — both systems coexist.
        */}
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
