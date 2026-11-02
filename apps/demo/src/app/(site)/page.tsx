import { Capabilities } from "@/components/landing/capabilities";
import { Comparison } from "@/components/landing/comparison";
import { CtaFooter } from "@/components/landing/cta-footer";
import { Faq } from "@/components/landing/faq";
import { bricolage, jetbrains } from "@/components/landing/fonts";
import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { Install } from "@/components/landing/install";
import { Loop } from "@/components/landing/loop";
import { WidgetDogfood } from "@/components/landing/widget-dogfood";

export default function LandingPage() {
  return (
    <div className={`landing ${bricolage.variable} ${jetbrains.variable} min-h-screen`}>
      <WidgetDogfood />
      <Header />
      <main>
        <Hero />
        <Loop />
        <Install />
        <Capabilities />
        <Comparison />
        <Faq />
        <CtaFooter />
      </main>
      <Footer />
    </div>
  );
}
