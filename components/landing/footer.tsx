import Link from "next/link";
import GitHubMarkIcon from "@/components/icons/GitHubMarkIcon";
import MailGlyphIcon from "@/components/icons/MailGlyphIcon";
import XMarkIcon from "@/components/icons/XMarkIcon";
import styles from "./landing.module.css";

const links = [
  { label: "Overview", href: "#overview" },
  { label: "Demo", href: "#demo" },
  { label: "Showcase", href: "#showcase" },
  { label: "Enter", href: "/login" },
];

const socials = [
  {
    Icon: GitHubMarkIcon,
    href: "https://github.com/webdm0",
    label: "GitHub",
    size: 16,
    external: true,
  },
  {
    Icon: XMarkIcon,
    href: "https://x.com/",
    label: "Twitter",
    size: 16,
    external: true,
  },
  {
    Icon: MailGlyphIcon,
    href: "mailto:you@example.com",
    label: "Email",
    size: 16,
  },
];

export function Footer() {
  return (
    <footer
      className={`relative overflow-hidden noise-bg ${styles.footerSection}`}
    >
      <div className={`absolute pointer-events-none ${styles.footerLine}`} />

      <div className={`w-full h-px ${styles.sectionDivider}`} />

      <div className="relative z-10 px-4 md:px-8 lg:px-12 py-24">
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-8 justify-between">
          <div className="lg:w-[40%]">
            <h3 className={`leading-[1.1] mb-6 ${styles.footerTitle}`}>
              SYSTEM.SPHERE_
            </h3>
            <p className={`max-w-sm mb-8 ${styles.footerCopy}`}>
              {
                "A focused kanban workspace for keeping tasks and context in one place. Work stays visible, clear, and easy to follow."
              }
            </p>
            <div
              className={`flex items-center gap-3 p-3 pl-4 max-w-xs ${styles.footerSourceBlock}`}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                className={styles.footerSourceCodeIcon}
              >
                <path
                  d="M16 18L22 12L16 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 6L2 12L8 18"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className={styles.footerSourceText}>Open Source</span>
              <span className={styles.footerSourceDivider} />
              <a
                href="https://github.com/webdm0/sphere-frontend"
                target="_blank"
                rel="noreferrer"
                className={styles.footerSourceLink}
              >
                Frontend
              </a>
              <span className={styles.footerSourceDot} />
              <a
                href="https://github.com/webdm0/sphere-backend"
                target="_blank"
                rel="noreferrer"
                className={styles.footerSourceLink}
              >
                Backend
              </a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-16 lg:gap-24">
            <div>
              <div className={`uppercase mb-6 ${styles.footerLabel}`}>
                {"// NAVIGATION"}
              </div>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className={`transition-opacity hover:opacity-70 ${styles.footerLink}`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className={`uppercase mb-6 ${styles.footerLabel}`}>
                {"// CONNECT"}
              </div>
              <div className="flex gap-3">
                {socials.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    target={social.external ? "_blank" : undefined}
                    rel={social.external ? "noreferrer" : undefined}
                    className={`flex items-center justify-center ${styles.footerSocial}`}
                  >
                    <social.Icon
                      size={social.size}
                      className={styles.footerSocialIcon}
                    />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          className={`mt-20 pt-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 ${styles.footerMetaRow}`}
        >
          <div className={`text-xs ${styles.footerMetaPrimary}`}>
            {"© 2026 SYSTEM.SPHERE_"}
          </div>
        </div>
      </div>

      <div className={`w-full overflow-hidden py-4 ${styles.footerMarquee}`}>
        <div className="flex animate-marquee whitespace-nowrap">
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              className={`uppercase mx-8 ${styles.footerMarqueeText}`}
            >
              START A BOARD // ORGANIZE TASKS // KEEP WORK MOVING //
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
