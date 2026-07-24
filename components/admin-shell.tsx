"use client";

import { LanguageProvider } from "@/components/language-provider";
import type { ReactNode } from "react";

export function AdminShell({ children }: { children: ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
