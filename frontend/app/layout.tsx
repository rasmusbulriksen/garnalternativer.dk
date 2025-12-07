import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/ui/Header";
import { Ubuntu_Mono } from "next/font/google";

const ubuntuMono = Ubuntu_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Garnalternativer - Yarn Substitution for Knitting Patterns",
  description: "Find yarn alternatives for your favorite knitting patterns",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={ubuntuMono.className} suppressHydrationWarning>
      <Header />
      {children}
      </body>
    </html>
  );
}

