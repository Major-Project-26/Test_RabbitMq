import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Chatbot & Communities App',
  description: 'A chatbot with RabbitMQ and community broadcasting',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="bg-blue-600 text-white p-4">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold">Chatbot & Communities</h1>
            <div className="space-x-4">
              <Link href="/chat" className="hover:text-blue-200">Chatbot</Link>
              <Link href="/communities" className="hover:text-blue-200">Communities</Link>
              <Link href="/admin" className="hover:text-blue-200">Admin</Link>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}
