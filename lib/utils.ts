/**
 * Shared utility functions
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility to merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format date to readable string
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

/**
 * Format date to ISO string for API
 */
export function toISOString(date: Date): string {
  return date.toISOString();
}

/**
 * Calculate user's age from birth date
 */
export function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

/**
 * Get current season (Northern Hemisphere)
 * TODO: Make location-aware
 */
export function getCurrentSeason(date: Date = new Date()): string {
  const month = date.getMonth();

  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "autumn";
  return "winter";
}

/**
 * Get week number of the year
 */
export function getWeekNumber(date: Date = new Date()): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

/**
 * Get current week start and end dates
 */
export function getCurrentWeekDates(): {
  start: Date;
  end: Date;
} {
  const now = new Date();
  const first = now.getDate() - now.getDay(); // Start on Sunday
  const last = first + 6; // End on Saturday

  const start = new Date(now.setDate(first));
  const end = new Date(now.setDate(last));

  return { start, end };
}

/**
 * Check if date is in the past
 */
export function isPast(date: Date): boolean {
  return new Date(date) < new Date();
}

/**
 * Check if date is in the future
 */
export function isFuture(date: Date): boolean {
  return new Date(date) > new Date();
}

/**
 * Truncate string to specified length
 */
export function truncateString(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Parse date string to Date object
 */
export function parseDate(dateString: string): Date | null {
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}
