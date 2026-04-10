"use client";

import React, { useEffect, useState } from "react";

const STORAGE_KEY = "zs-demo-banner-dismissed";

const DemoBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  if (dismissed) return null;

  return (
    <div className="bg-dark text-white text-sm">
      <div className="max-w-[1400px] mx-auto px-4 py-2.5 flex items-start gap-3">
        <span aria-hidden className="mt-0.5">
          •
        </span>
        <p className="flex-1 leading-relaxed">
          <span className="font-semibold">Heads up:</span> this site exists
          to showcase Jordan&apos;s personal inventory. Browse freely, but
          online checkout won&apos;t actually charge or ship anything. To
          buy, call{" "}
          <a
            href="tel:+17408196592"
            className="underline underline-offset-2 hover:text-blue"
          >
            (740) 819-6592
          </a>{" "}
          or{" "}
          <a
            href="mailto:jordan@Jlang.dev"
            className="underline underline-offset-2 hover:text-blue"
          >
            email Jordan
          </a>
          .
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss notice"
          className="text-white/70 hover:text-white shrink-0"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default DemoBanner;
