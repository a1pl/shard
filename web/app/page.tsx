"use client";

import Link from "next/link";
import { useState } from "react";
import {
  RiDownloadLine,
  RiGithubFill,
  RiBookOpenLine,
  RiArrowRightLine,
  RiArrowDownSLine,
  RiMenuLine,
  RiCloseLine,
  RiStackLine,
  RiShieldCheckLine,
  RiTerminalLine,
  RiAppleFill,
} from "@remixicon/react";
import { LauncherPreview } from "@/components/launcher-hero";

// FAQ Item Component
function FaqItem({
  question,
  children,
}: {
  question: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[rgb(var(--border))]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-4 text-left font-medium text-[rgb(var(--foreground))] hover:text-[rgb(var(--accent))] transition-colors"
      >
        <span className="text-sm">{question}</span>
        <RiArrowDownSLine
          className={`h-4 w-4 text-[rgb(var(--foreground-tertiary))] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="pb-4 text-sm text-[rgb(var(--foreground-secondary))] leading-relaxed">
          {children}
        </div>
      )}
    </div>
  );
}

// Feature Card Component
function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-lg surface-1 p-5 border border-[rgb(var(--border))] hover:border-[rgb(var(--border-elevated))] transition-colors">
      <div className="mb-3 inline-flex rounded-md bg-[rgb(var(--accent))]/10 p-2">
        <Icon className="h-5 w-5 text-[rgb(var(--accent))]" />
      </div>
      <h3 className="mb-1.5 text-sm font-semibold text-[rgb(var(--foreground))]">
        {title}
      </h3>
      <p className="text-sm text-[rgb(var(--foreground-secondary))] leading-relaxed">
        {description}
      </p>
    </div>
  );
}

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen surface-0">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-[rgb(var(--border))]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-lg font-semibold text-[rgb(var(--foreground))]">
              Shard
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="https://github.com/Th0rgal/shard"
              className="text-xs font-medium text-[rgb(var(--foreground-secondary))] hover:text-[rgb(var(--foreground))] transition-colors"
            >
              GitHub
            </Link>
            <Link
              href="/docs"
              className="text-xs font-medium text-[rgb(var(--foreground-secondary))] hover:text-[rgb(var(--foreground))] transition-colors"
            >
              Documentation
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/docs"
              className="hidden sm:inline-flex items-center rounded-md bg-[rgb(var(--accent))] px-3 py-1.5 text-xs font-medium text-white hover:bg-[rgb(var(--accent-hover))] transition-colors"
            >
              View Docs
            </Link>
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md hover:bg-[rgb(var(--foreground))]/10 transition-colors"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? (
                <RiCloseLine className="h-5 w-5 text-[rgb(var(--foreground))]" />
              ) : (
                <RiMenuLine className="h-5 w-5 text-[rgb(var(--foreground))]" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[rgb(var(--border))] surface-1 animate-fade-in">
            <nav className="mx-auto max-w-5xl px-4 py-3 flex flex-col gap-1">
              <Link
                href="https://github.com/Th0rgal/shard"
                className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium text-[rgb(var(--foreground-secondary))] hover:text-[rgb(var(--foreground))] hover:bg-[rgb(var(--foreground))]/5 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <RiGithubFill className="h-4 w-4" />
                GitHub
              </Link>
              <Link
                href="/docs"
                className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium text-[rgb(var(--foreground-secondary))] hover:text-[rgb(var(--foreground))] hover:bg-[rgb(var(--foreground))]/5 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <RiBookOpenLine className="h-4 w-4" />
                Documentation
              </Link>
              <div className="mt-2 pt-2 border-t border-[rgb(var(--border))]">
                <Link
                  href="/docs"
                  className="flex items-center justify-center rounded-md bg-[rgb(var(--accent))] px-3 py-2.5 text-sm font-medium text-white hover:bg-[rgb(var(--accent-hover))] transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  View Docs
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main>
        {/* Hero Section */}
        <section className="mx-auto max-w-5xl px-4 py-16">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-[rgb(var(--foreground))] mb-4">
              A Minecraft Launcher Built Different
            </h1>
            <p className="text-lg text-[rgb(var(--foreground-secondary))] max-w-2xl mx-auto mb-8">
              Minimal, content-addressed, and focused on stability. Manage profiles, mods, and resource packs with zero duplication.
            </p>

            {/* Download buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
              <Link
                href="https://github.com/Th0rgal/shard/releases/latest"
                className="inline-flex items-center gap-2 rounded-md bg-[rgb(var(--accent))] px-5 py-2.5 text-sm font-medium text-white hover:bg-[rgb(var(--accent-hover))] transition-colors"
              >
                <RiAppleFill className="h-4 w-4" />
                Download for macOS
              </Link>
              <Link
                href="https://github.com/Th0rgal/shard"
                className="inline-flex items-center gap-2 rounded-md border border-[rgb(var(--border))] surface-1 px-5 py-2.5 text-sm font-medium text-[rgb(var(--foreground-secondary))] hover:border-[rgb(var(--border-elevated))] hover:text-[rgb(var(--foreground))] transition-colors"
              >
                <RiGithubFill className="h-4 w-4" />
                View Source
              </Link>
            </div>
          </div>

          {/* Launcher Preview */}
          <LauncherPreview />
        </section>

        {/* Features Section */}
        <section className="mx-auto max-w-5xl px-4 py-12">
          <div className="text-center mb-8">
            <span className="inline-block rounded-md bg-[rgb(var(--accent))]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--accent))]">
              Features
            </span>
            <h2 className="mt-3 text-xl font-semibold text-[rgb(var(--foreground))]">
              Why choose Shard?
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3 max-w-3xl mx-auto">
            <FeatureCard
              icon={RiStackLine}
              title="Content Deduplication"
              description="SHA-256 content-addressed storage means mods are never duplicated across profiles. Save disk space automatically."
            />
            <FeatureCard
              icon={RiShieldCheckLine}
              title="Stable & Reproducible"
              description="Declarative profile manifests ensure your setup works the same way every time. No magic state."
            />
            <FeatureCard
              icon={RiTerminalLine}
              title="CLI-First Design"
              description="Everything can be scripted. The GUI is optional; the CLI is the source of truth."
            />
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mx-auto max-w-2xl px-4 py-12">
          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold text-[rgb(var(--foreground))]">
              Frequently Asked Questions
            </h2>
            <p className="mt-2 text-sm text-[rgb(var(--foreground-secondary))]">
              Have another question?{" "}
              <Link
                href="https://github.com/Th0rgal/shard/issues"
                className="text-[rgb(var(--accent))] hover:text-[rgb(var(--accent-hover))]"
              >
                Open an issue
              </Link>
            </p>
          </div>

          <div className="rounded-lg border border-[rgb(var(--border))] surface-1 px-4">
            <FaqItem question="What platforms are supported?">
              Currently Shard is available for macOS. Windows and Linux support is planned for future releases.
            </FaqItem>
            <FaqItem question="Does it support modded Minecraft?">
              Yes! Shard supports Fabric, Forge, and NeoForge loaders. You can browse and install mods from Modrinth and CurseForge directly within the launcher.
            </FaqItem>
            <FaqItem question="How does content deduplication work?">
              When you add a mod or resource pack, Shard computes its SHA-256 hash and stores it in a content-addressed store. If another profile uses the same mod, it simply references the existing file. No copies are made.
            </FaqItem>
            <FaqItem question="Can I use my existing Minecraft account?">
              Yes, Shard uses Microsoft OAuth authentication. Your existing Microsoft account works seamlessly, and you can add multiple accounts.
            </FaqItem>
            <FaqItem question="Is Shard open source?">
              Yes, Shard is fully open source. The core library is written in Rust, and the desktop app uses Tauri with React. See the{" "}
              <Link
                href="https://github.com/Th0rgal/shard"
                className="text-[rgb(var(--accent))] hover:underline"
              >
                GitHub repository
              </Link>{" "}
              for the source code.
            </FaqItem>
            <FaqItem question="Where is my data stored?">
              All data is stored locally in <code className="px-1.5 py-0.5 bg-[rgb(var(--background-tertiary))] rounded text-xs">~/.shard/</code>. This includes profiles, the content store, Minecraft data, and your account tokens.
            </FaqItem>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[rgb(var(--border))]">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <div className="flex flex-col items-center justify-between gap-3 md:flex-row">
            <p className="text-xs text-[rgb(var(--foreground-muted))]">
              © {new Date().getFullYear()}{" "}
              <Link
                href="https://thomas.md"
                className="text-[rgb(var(--foreground-tertiary))] hover:text-[rgb(var(--foreground-secondary))] transition-colors"
              >
                Thomas Marchand
              </Link>
            </p>
            <Link
              href="https://github.com/Th0rgal/shard"
              className="text-[rgb(var(--foreground-muted))] hover:text-[rgb(var(--foreground-tertiary))] transition-colors"
            >
              <RiGithubFill className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
