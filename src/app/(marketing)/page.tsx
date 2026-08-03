import Hero from "@/components/Hero";
import About from "@/components/About";
import Services from "@/components/Services";
import Portfolio from "@/components/Portfolio";
import ProcessPreview from "@/components/ProcessPreview";
import ReviewPreview from "@/components/ReviewPreview";
import ContactCTA from "@/components/ContactCTA";

export default function Home() {
  return (
    <>
      <Hero />
      <About />
      <Services />
      <Portfolio />
      <ProcessPreview />
      <ReviewPreview />
      <ContactCTA />
    </>
  );
}
