import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Coralux HQ",
  description:
    "The operating system for Coralux — tasks, invoices, payments, vendors, employees and documents in one connected place.",
  appleWebApp: {
    capable: true,
    title: "Coralux HQ",
    // "default" = light status bar with dark text, matching the app.
    statusBarStyle: "default",
  },
  other: {
    // Next only emits the newer standardised "mobile-web-app-capable" tag.
    // iOS versions before 17.4 only recognise this prefixed one to hide the
    // Safari chrome when launched from the home screen, so both go out.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#f6f4f2",
  // The app always renders in its light palette, regardless of the device
  // theme — this tells browser chrome (scrollbars, form controls, the iOS
  // status bar) the same thing color-scheme does in globals.css.
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
