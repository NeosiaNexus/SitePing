import { Banner } from "@/components/demo/banner";

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Banner />
      {children}
    </>
  );
}
