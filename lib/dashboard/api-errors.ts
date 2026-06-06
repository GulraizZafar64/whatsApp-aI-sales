export const INCOMPLETE_BUSINESS_SETUP_ERROR =
  "Complete business setup first.";

export function isIncompleteBusinessSetupError(
  message: unknown
): boolean {
  return (
    typeof message === "string" &&
    message === INCOMPLETE_BUSINESS_SETUP_ERROR
  );
}

/** Do not surface setup-incomplete API errors as toasts. */
export function shouldToastDashboardApiError(message: unknown): boolean {
  return !isIncompleteBusinessSetupError(message);
}
