// // src/app/layout.tsx

// import type { Metadata } from "next";
// import { Inter } from "next/font/google";
// import "./globals.css"; // File CSS chung của bạn
// import Header from "@/components/Header"; // Header giờ là Client Component

// // Không cần force-dynamic nữa
// // export const dynamic = 'force-dynamic';

// const inter = Inter({ subsets: ["latin"] });

// export const metadata: Metadata = {
//   title: "Sàn Giao Dịch Mô Hình Xe",
//   description: "Cộng đồng mua bán, trao đổi mô hình 1/64",
// };

// // Layout là Server Component, nhưng Header bên trong là Client Component
// export default function RootLayout({
//   children,
// }: Readonly<{
//   children: React.ReactNode;
// }>) {
//   return (
//     <html lang="en">
//       <body className={inter.className}>
//         <Header />
//         {/* Nội dung trang (page.tsx) sẽ chui vào đây */}
//         <main className="container mx-auto py-8">{children}</main>
//         {/* Có thể thêm Footer ở đây */}
//       </body>
//     </html>
//   );
// }

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
