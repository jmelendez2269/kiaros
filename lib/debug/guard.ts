import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Guard debug routes from production access unless the user is an admin.
 * 
 * Returns a 404 response if:
 * - Running in production (VERCEL_ENV === 'production' or NODE_ENV === 'production'
 *   when VERCEL_ENV is not explicitly 'preview' or 'development')
 * - AND the user is not authenticated or not an admin
 * 
 * Otherwise returns null (allowing the request to proceed).
 * 
 * @returns NextResponse with 404 if blocked, null if allowed
 */
export async function guardDebugRoute(): Promise<NextResponse | null> {
  const isProduction = isProductionEnvironment();
  
  if (!isProduction) {
    // Non-production: allow all
    return null;
  }

  // Production: check if user is admin
  const user = await currentUser();
  if (user && user.publicMetadata?.isAdmin === true) {
    // Admin in production: allow
    return null;
  }

  // Production non-admin: hide the route
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

/**
 * Check if running in production environment.
 * Careful: next build sets NODE_ENV=production even on Vercel preview deployments,
 * so we key off VERCEL_ENV when present.
 */
export function isProductionEnvironment(): boolean {
  const vercelEnv = process.env.VERCEL_ENV;
  
  if (vercelEnv) {
    // On Vercel: trust VERCEL_ENV
    return vercelEnv === "production";
  }
  
  // Not on Vercel: fall back to NODE_ENV
  return process.env.NODE_ENV === "production";
}
