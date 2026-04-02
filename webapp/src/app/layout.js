import "./globals.css";
import Script from "next/script";

export const metadata = {
  title: "Bingo Son - Telegram Bingo Game",
  description: "Play Bingo and win ETB! Join rooms, pick your card, and claim your prize.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
