import type { Metadata } from "next";
import AmbientCanvas from "@/components/common/AmbientCanvas";
import ReactQueryProvider from "@/components/common/ReactQueryProvider";
import AuthGate from "@/providers/AuthGate";
import StoreProvider from "@/providers/StoreProvider";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function PlatformLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <AmbientCanvas />
      <StoreProvider>
        <ReactQueryProvider>
          <AuthGate>{children}</AuthGate>
        </ReactQueryProvider>
      </StoreProvider>
    </>
  );
}
