import { Header } from '@/components/ui/header'

export default function ExploreLayout({
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
    </div>
  )
}
