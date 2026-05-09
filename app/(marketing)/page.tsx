import { Header } from "@/components/landing/header"
import { Hero } from "@/components/landing/hero"
import { KanbanDemo } from "@/components/landing/kanban-demo"
import { Showcase } from "@/components/landing/showcase"
import { Footer } from "@/components/landing/footer"

export default function Home() {
  return (
    <main>
      <Header />
      <Hero />
      <KanbanDemo />
      <Showcase />
      <Footer />
    </main>
  )
}
