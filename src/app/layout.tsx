// src/app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { UserProvider } from "@/contexts/UserContext"; // <-- IMPORT PROVIDER

const inter = Inter({ subsets: ["latin"] });
export const metadata: Metadata = {
  title: "Sàn Giao Dịch Mô Hình Xe",
  description: "Cộng đồng mua bán, trao đổi mô hình 1/64",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <UserProvider>
          <Header />
          <main className="container mx-auto py-8">{children}</main>
        </UserProvider>
      </body>
    </html>
  );
}
