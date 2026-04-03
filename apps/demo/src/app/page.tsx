import { LandingAnimations } from "@/components/landing/animations";
import { Comparison } from "@/components/landing/comparison";
import { CtaFooter } from "@/components/landing/cta-footer";
import { Faq } from "@/components/landing/faq";
import { Features } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { WidgetDogfood } from "@/components/landing/widget-dogfood";

export default function LandingPage() {
  return (
    <>
      <LandingAnimations />
      <WidgetDogfood />
      <Header />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Comparison />
        <Faq />
        <CtaFooter />
      </main>
      <Footer />
    </>
  );
}
