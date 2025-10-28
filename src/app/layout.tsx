// // src/app/layout.tsx

// import type { Metadata } from "next";
// import { Inter } from "next/font/google";
// import "./globals.css";
// import Header from "@/components/Header"; // <-- 1. Import Header

// const inter = Inter({ subsets: ["latin"] });

// export const metadata: Metadata = {
//   title: "Sàn Giao Dịch Mô Hình Xe",
//   description: "Cộng đồng mua bán, trao đổi mô hình 1/64",
// };

// export default function RootLayout({
//   children,
// }: Readonly<{
//   children: React.ReactNode;
// }>) {
//   return (
//     <html lang="en">
//       <body className={inter.className}>
//         <Header /> {/* <-- 2. Thêm Header ở đây */}
//         {/* Phần `children` chính là các trang page.tsx của bạn */}
//         <main className="container mx-auto py-8">{children}</main>
//         {/* Bạn cũng có thể thêm Footer ở đây */}
//       </body>
//     </html>
//   );
// }

// src/app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header"; // 1. Import Header

// THÊM DÒNG NÀY VÀO:
export const dynamic = "force-dynamic";
// Dòng này báo cho Next.js biết layout này luôn render động khi có request

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sàn Giao Dịch Mô Hình Xe",
  description: "Cộng đồng mua bán, trao đổi mô hình 1/64",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Header /> {/* 2. Header (Server Component) sẽ gọi cookies() */}
        <main className="container mx-auto py-8">{children}</main>
      </body>
    </html>
  );
}
