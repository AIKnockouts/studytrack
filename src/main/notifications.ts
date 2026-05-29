import notifier from 'node-notifier'

export function sendNotification(title: string, message: string): void {
  try {
    notifier.notify({ title, message, sound: false })
  } catch {
    // Notifications are best-effort — never crash the app
  }
}
