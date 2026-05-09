import type { Metadata } from "next";
import "./landing.css";

const landingDescription =
  "Sphere is an experimental kanban board with a calm interface, fast interactions, and clear task context.";

export const metadata: Metadata = {
  title: {
    absolute: "Sphere",
  },
  description: landingDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Sphere",
    description: landingDescription,
    url: "/",
    siteName: "Sphere",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sphere",
    description: landingDescription,
  },
};

export default function LandingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="landing-app">{children}</div>;
}
