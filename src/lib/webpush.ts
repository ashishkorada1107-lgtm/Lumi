import webpush from "web-push";

/**
 * Safely configures web-push on demand.
 * This prevents module-level initialization errors which crash the root page if VAPID keys are malformed.
 */
export function configureWebPush(): { success: true } | { success: false, error: string } {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    return { 
      success: false, 
      error: "VAPID configuration is missing. NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT are required." 
    };
  }

  try {
    webpush.setVapidDetails(
      subject,
      publicKey.trim(),
      privateKey.trim()
    );
    return { success: true };
  } catch (err: any) {
    return { 
      success: false, 
      error: "Failed to initialize VAPID keys: " + err.message
    };
  }
}
