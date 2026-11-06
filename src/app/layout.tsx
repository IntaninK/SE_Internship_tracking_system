import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ระบบบริหารจัดการการฝึกงานและสหกิจศึกษา - คณะ ICT มหาวิทยาลัยพะเยา",
  description: "ระบบบริหารจัดการการฝึกงานและสหกิจศึกษา คณะเทคโนโลยีสารสนเทศและการสื่อสาร มหาวิทยาลัยพะเยา (ICT UP)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Prompt:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Kanit:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/css/main-output.css" />
        <link rel="stylesheet" href="/css/modern-ict.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}

