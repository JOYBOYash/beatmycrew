
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import VideoBackground from "@/components/video-background";
import FirebaseClientProvider from "@/firebase/client-provider";
import FirebaseErrorListener from "@/components/FirebaseErrorListener";
import { UserProvider } from "@/firebase/auth/use-user";
import { Pirata_One } from "next/font/google";

const pirateFont = Pirata_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pirate",
});


export const metadata: Metadata = {
  title: "BeatMyCrew",
  description: "Assemble your ultimate One Piece crew and get rated!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={pirateFont.variable} suppressHydrationWarning  >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap"
          rel="stylesheet"
          crossOrigin="anonymous"
        />
      </head>
      <body className={cn("font-body antialiased min-h-screen")}
      style={{
     backgroundImage: "url('/map_bg.jpg')",
      }}
      >
        <FirebaseClientProvider>
          <UserProvider>
            <div className="relative z-10">{children}</div>
            <Toaster />
            <FirebaseErrorListener />
          </UserProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
