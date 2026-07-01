"use client";

import { useEffect, useState } from "react";
import { useResumeStore } from "@/store/useResumeStore";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { appTheme } = useResumeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      if (appTheme === 'anthropic') {
        document.body.classList.add('theme-anthropic');
      } else {
        document.body.classList.remove('theme-anthropic');
      }
    }
  }, [appTheme, mounted]);

  return <>{children}</>;
}
