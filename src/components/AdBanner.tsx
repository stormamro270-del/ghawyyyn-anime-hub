import { useEffect, useRef } from "react";

// ضع كود AdSense الخاص بك هنا
const ADSENSE_CLIENT = "ca-pub-XXXXXXXXXXXXXXXX"; // ← غيّر ده برقم حسابك
const ADSENSE_SLOT = "1234567890"; // ← غيّر ده برقم الوحدة الإعلانية

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

interface AdBannerProps {
  slot?: string;
  format?: "auto" | "fluid" | "rectangle";
  className?: string;
}

export function AdBanner({
  slot = ADSENSE_SLOT,
  format = "auto",
  className = "",
}: AdBannerProps) {
  const pushed = useRef(false);

  useEffect(() => {
    // حقن سكربت AdSense مرة واحدة
    if (typeof window === "undefined") return;
    const scriptId = "adsense-script";
    if (!document.getElementById(scriptId) && ADSENSE_CLIENT.includes("XXXX") === false) {
      const s = document.createElement("script");
      s.id = scriptId;
      s.async = true;
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
      s.crossOrigin = "anonymous";
      document.head.appendChild(s);
    }

    try {
      if (!pushed.current) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        pushed.current = true;
      }
    } catch (e) {
      console.warn("AdSense not loaded yet", e);
    }
  }, []);

  // عرض placeholder لو لسه AdSense مش متفعل
  if (ADSENSE_CLIENT.includes("XXXX")) {
    return (
      <div
        className={`cyber-border my-6 flex h-24 items-center justify-center rounded-xl text-xs text-muted-foreground ${className}`}
      >
        مساحة إعلانية — ضع كود AdSense في src/components/AdBanner.tsx
      </div>
    );
  }

  return (
    <div className={`my-6 ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
