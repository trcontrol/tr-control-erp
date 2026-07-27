import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { APP_NAME } from "@/lib/constants";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans-family",
});

const display = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-display-family",
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: "Sistema ERP multiempresa para gestão empresarial",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${sans.variable} ${display.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
