import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { SocketProvider } from '@/lib/socket-context'
import './globals.css'

const geistSans = Geist({ 
  subsets: ["latin", "vietnamese"],
  variable: '--font-geist-sans',
});

const geistMono = Geist_Mono({ 
  subsets: ["latin", "vietnamese"],
  variable: '--font-geist-mono',
});

export const metadata: Metadata = {
  title: "Fotobe's Bingo - Trò chơi Bingo nhiều người",
  description: 'Chơi Bingo với tối đa 20 người chơi theo thời gian thực!',
  generator: 'trantu',
}

export const viewport: Viewport = {
  themeColor: '#1a1a1a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi" className="dark bg-background">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased min-h-screen`}>
        <SocketProvider>
          {children}
          <Toaster 
            position="top-center" 
            richColors 
            theme="dark"
            toastOptions={{
              style: {
                background: 'rgba(30, 30, 30, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
              },
            }}
          />
        </SocketProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
