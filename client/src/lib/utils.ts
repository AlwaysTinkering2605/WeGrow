import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isTestMode(): boolean {
  return import.meta.env.VITE_TEST_MODE === 'true';
}
