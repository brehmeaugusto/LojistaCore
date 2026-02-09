import React from "react"
import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'

import { SupabaseHydrate } from "@/components/supabase-hydrate"
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'LojistaCore - Sistema de Gestao para Loja de Roupas',
  description: 'Sistema completo de gestao para loja de roupas com PDV, Estoque, Custos, Precificacao, Financeiro e Admin Global',
}

export const viewport: Viewport = {
  themeColor: '#1F2933',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">
        <SupabaseHydrate />
        {children}
      </body>
    </html>
  )
}
