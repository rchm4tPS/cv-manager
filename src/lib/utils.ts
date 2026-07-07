import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatSalaryString(text: string) {
  if (!text || text.trim() === "") return "-";
  if (text === "-") return "-"; // preserve existing dashes
  const cleanText = text.replace(/,/g, '');
  return cleanText.replace(/\d+/g, (match) => {
    return Number(match).toLocaleString('en-US');
  });
}

