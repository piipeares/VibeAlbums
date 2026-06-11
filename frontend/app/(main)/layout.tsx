import { Header } from '@/components/ui/header'
import { Toaster } from '@/components/ui/toast'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-20 pb-10">
        {children}
      </main>
      <Toaster />
    </div>
  )
}
