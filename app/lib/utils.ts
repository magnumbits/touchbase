// Utility functions for Touchbase

export function validatePhoneNumber(phone: string): boolean {
  // Simple E.164 validation
  return /^\+?[1-9]\d{1,14}$/.test(phone);
}

export function generateSessionId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

export function formatDateTime(dt: string | Date): string {
  const date = typeof dt === 'string' ? new Date(dt) : dt;
  return date.toLocaleString();
}
