/**
 * Vercel Web Analytics Setup
 * 
 * This module initializes Vercel Web Analytics for the application.
 * It uses the inject function from @vercel/analytics which adds the tracking script to the app.
 * 
 * Note: This should only be called once in the app, and must run in the client.
 * There is no route support with the inject function.
 */

import { inject } from "@vercel/analytics";

/**
 * Initialize Vercel Web Analytics
 * 
 * This function injects the Vercel analytics script into the page.
 * It should be called early in the application initialization.
 */
export function initializeAnalytics(): void {
  inject();
}
