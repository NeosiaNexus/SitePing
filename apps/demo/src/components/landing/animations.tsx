"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect } from "react";

export function LandingAnimations() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    // --- Hero: immediate on load (no ScrollTrigger) ---
    const heroBadge = document.querySelector('[data-gsap="hero-badge"]');
    const heroTitle = document.querySelector('[data-gsap="hero-title"]');
    const heroSubtitle = document.querySelector('[data-gsap="hero-subtitle"]');
    const heroCta = document.querySelector('[data-gsap="hero-cta"]');
    const heroMockup = document.querySelector('[data-gsap="hero-mockup"]');

    gsap.set([heroBadge, heroTitle, heroSubtitle, heroCta, heroMockup].filter(Boolean), { opacity: 0 });
    gsap.set(heroBadge, { y: 15 });
    gsap.set(heroTitle, { y: 30, scale: 0.97 });
    gsap.set(heroSubtitle, { y: 20 });
    gsap.set(heroCta, { y: 20 });
    gsap.set(heroMockup, { y: 40, scale: 0.97 });

    const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });

    heroTl
      .to(heroBadge, { opacity: 1, y: 0, duration: 0.5 })
      .to(heroTitle, { opacity: 1, y: 0, scale: 1, duration: 0.8 }, "-=0.3")
      .to(heroSubtitle, { opacity: 1, y: 0, duration: 0.7 }, "-=0.5")
      .to(heroCta, { opacity: 1, y: 0, duration: 0.6 }, "-=0.4")
      .to(heroMockup, { opacity: 1, y: 0, scale: 1, duration: 0.8 }, "-=0.3");

    // --- Scroll-triggered sections ---

    // Section titles
    const sectionTitles = gsap.utils.toArray<Element>('[data-gsap="section-title"]');
    for (const el of sectionTitles) {
      gsap.set(el, { opacity: 0, y: 30 });
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
      });
    }

    // Feature cards — large cards: fade up with scale
    const featureCardsLarge = gsap.utils.toArray<Element>('[data-gsap="feature-card-large"]');
    if (featureCardsLarge.length > 0) {
      gsap.set(featureCardsLarge, { opacity: 0, y: 30, scale: 0.97 });
      gsap.to(featureCardsLarge, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.7,
        stagger: 0.15,
        ease: "power2.out",
        scrollTrigger: {
          trigger: featureCardsLarge[0],
          start: "top 85%",
          once: true,
        },
      });
    }

    // Feature cards — small cards: staggered fade up
    const featureCards = gsap.utils.toArray<Element>('[data-gsap="feature-card"]');
    if (featureCards.length > 0) {
      gsap.set(featureCards, { opacity: 0, y: 30 });
      gsap.to(featureCards, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: featureCards[0],
          start: "top 85%",
          once: true,
        },
      });
    }

    // Steps — sequential reveal
    const steps = gsap.utils.toArray<Element>('[data-gsap="step"]');
    if (steps.length > 0) {
      gsap.set(steps, { opacity: 0, y: 30 });
      gsap.to(steps, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        stagger: 0.2,
        ease: "power2.out",
        scrollTrigger: { trigger: steps[0], start: "top 85%", once: true },
      });
    }

    // Comparison table
    const comparison = document.querySelector('[data-gsap="comparison"]');
    if (comparison) {
      gsap.set(comparison, { opacity: 0, y: 30 });
      gsap.to(comparison, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: "power2.out",
        scrollTrigger: { trigger: comparison, start: "top 85%", once: true },
      });
    }

    // FAQ items — staggered fade-up
    const faqItems = gsap.utils.toArray<Element>('[data-gsap="faq-item"]');
    if (faqItems.length > 0) {
      gsap.set(faqItems, { opacity: 0, y: 30 });
      gsap.to(faqItems, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: faqItems[0],
          start: "top 85%",
          once: true,
        },
      });
    }

    // CTA section
    const ctaSection = document.querySelector('[data-gsap="cta-section"]');
    if (ctaSection) {
      gsap.set(ctaSection, { opacity: 0, y: 30 });
      gsap.to(ctaSection, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: "power2.out",
        scrollTrigger: { trigger: ctaSection, start: "top 85%", once: true },
      });
    }

    return () => {
      ScrollTrigger.killAll();
    };
  }, []);

  return null;
}
