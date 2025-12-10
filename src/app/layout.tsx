
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import VideoBackground from "@/components/video-background";
import TaskbarNav from "@/components/taskbar-nav";
import FirebaseClientProvider from "@/firebase/client-provider";
import FirebaseErrorListener from "@/components/FirebaseErrorListener";
import { UserProvider } from "@/firebase/auth/use-user";

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
    <html lang="en" suppressHydrationWarning>
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
      <body className={cn("font-body antialiased min-h-screen")}>
        <FirebaseClientProvider>
          <UserProvider>
            <VideoBackground />
            <div className="relative z-10 pb-24">{children}</div>
            <TaskbarNav />
            <Toaster />
            <FirebaseErrorListener />
          </UserProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
