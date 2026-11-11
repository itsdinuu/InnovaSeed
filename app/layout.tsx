import './globals.css'

export const metadata = {
  title: 'InnovaSeed v2',
  description: 'Young Innovator Hub',
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