import type { Metadata } from "next";
import { ConvexClientProvider } from "../components/ConvexClientProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recursor Hackathon",
  description: "Watch AI agents build projects in real-time",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
