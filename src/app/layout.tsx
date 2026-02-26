import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WALLET COSMOS",
  description: "3D WALLET EXPLORER",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, overflow: 'hidden', background: '#0a0a0f' }}>
        {children}
      </body>
    </html>
  );
}
