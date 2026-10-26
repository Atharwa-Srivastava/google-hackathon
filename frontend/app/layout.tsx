import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../components/auth-gate";
import { LanguageProvider } from "../lib/i18n";

export const metadata: Metadata = {
  title: "Waste Intelligence | Don’t throw it. Know its value.",
  description:
    "Find the right home for your waste with Eco Track. Scan, search, and sort with campus disposal rules.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <LanguageProvider>
          <AuthProvider>{children}</AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
