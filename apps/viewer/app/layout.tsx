import type { Metadata } from "next";
import "./globals.css";
import { ConvexClientProvider } from "../components/ConvexClientProvider";

export const metadata: Metadata = {
  title: "Recursor - Live Hackathon Simulation",
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

