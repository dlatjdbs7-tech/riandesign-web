import Hero from "@/components/Hero";
import About from "@/components/About";
import Services from "@/components/Services";
import Portfolio from "@/components/Portfolio";
import ProcessPreview from "@/components/ProcessPreview";
import ReviewPreview from "@/components/ReviewPreview";
import ContactCTA from "@/components/ContactCTA";
import PortfolioHashRedirect from "@/components/PortfolioHashRedirect";

export default function Home() {
  return (
    <>
      <PortfolioHashRedirect />
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
