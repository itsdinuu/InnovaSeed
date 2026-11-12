import './globals.css'
import '@fortawesome/fontawesome-free/css/all.min.css' // <-- Wajib ada di sini!

export const metadata = {
  title: 'InnovaSeed v2',
  description: 'Young Innovator Hub',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 font-sans antialiased">
        {children}
      </body>
    </html>
  )
}