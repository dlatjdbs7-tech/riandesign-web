import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageViewTracker from "@/components/PageViewTracker";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageViewTracker />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
