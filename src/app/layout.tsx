
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
  title: "BeatMyCrew | One-Piece Edition",
  description: "Create your Own Pirate Crews, join Fights with freinds and Draft crewmates randomly and beat theirs with yours!..",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={pirateFont.variable} suppressHydrationWarning  >
    
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/android-chrome-192x192.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/android-chrome-512x512.png" />

        {/* Apple Touch Icon */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Web App Manifest */}
        <link rel="manifest" href="/site.webmanifest" />

        <meta property="og:image" content="https://beatmycrew.vercel.app/main-logo.png" />
        <meta property="og:image:alt" content="Beat My Crew Logo" />
        <meta name="twitter:image" content="https://beatmycrew.vercel.app/main-logo.png" />
        <meta property="og:title" content="Beat My Crew | One Piece Edition " />
        <meta property="og:description" content="Create your Own Pirate Crews, join Fights with freinds and Draft crewmates randomly and beat theirs with yours!.." />
        <meta name="twitter:card" content="https://beatmycrew.vercel.app/main-logo.png" />
        <meta property="twitter:image:alt" content="Beat My Crew Logo" />
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
