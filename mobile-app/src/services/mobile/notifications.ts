import { Capacitor } from '@capacitor/core'
import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications'
import type { AlertItem } from '../../types'

function notificationId(item: AlertItem, offset: number): number {
  const seed = `${item.type}:${item.target_id}:${item.date}:${offset}`
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) hash = ((hash << 5) - hash + seed.charCodeAt(index)) | 0
  return Math.abs(hash % 2_000_000_000) + 1
}

export async function requestNativeNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false
  const current = await LocalNotifications.checkPermissions()
  if (current.display === 'granted') return true
  const requested = await LocalNotifications.requestPermissions()
  return requested.display === 'granted'
}

export async function scheduleNativeAlerts(items: AlertItem[]): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  if (!(await requestNativeNotificationPermission())) return
  const pending = await LocalNotifications.getPending()
  if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map((item: { id: number }) => ({ id: item.id })) })
  const now = new Date()
  const notifications: LocalNotificationSchema[] = []
  for (const item of items) {
    const due = new Date(`${item.date}T09:00:00`)
    for (const offset of [7, 3, 0]) {
      const at = new Date(due)
      at.setDate(at.getDate() - offset)
      if (at <= now) continue
      notifications.push({
        id: notificationId(item, offset),
        title: item.title,
        body: offset === 0 ? item.message : `${offset} dia(s) para o vencimento • ${item.message}`,
        schedule: { at, allowWhileIdle: true },
        extra: { page: item.target_page, targetId: item.target_id, month: item.month || '' },
      })
    }
  }
  if (notifications.length) await LocalNotifications.schedule({ notifications })
}

export async function installNotificationNavigation(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  await LocalNotifications.addListener('localNotificationActionPerformed', (action: { notification: { extra?: unknown } }) => {
    const extra = action.notification.extra as { page?: string; targetId?: number; month?: string } | undefined
    if (!extra?.page) return
    const params = new URLSearchParams()
    if (extra.targetId) params.set('target', String(extra.targetId))
    if (extra.month) params.set('month', extra.month)
    window.location.hash = `${extra.page}?${params.toString()}`
  })
}
