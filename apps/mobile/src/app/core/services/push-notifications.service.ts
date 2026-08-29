import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  ActionPerformed,
  PermissionStatus,
  PushNotificationSchema,
  PushNotifications,
} from '@capacitor/push-notifications';

/**
 * Registers for native push (APNs/FCM via Capacitor) and routes a tapped
 * notification to the relevant screen. There is no push provider/backend
 * wired up to actually *send* notifications in this environment — this is
 * the client-side half of the feature, ready for a backend sender (e.g.
 * via a NotificationProvider on the API, mirroring EmailProvider) to be
 * added behind the same `notifications` domain.
 */
@Injectable({ providedIn: 'root' })
export class PushNotificationsService {
  private readonly router = inject(Router);
  private readonly permissionSignal = signal<'granted' | 'denied' | 'unknown'>('unknown');
  readonly permission = this.permissionSignal.asReadonly();

  async register(): Promise<void> {
    try {
      const permission: PermissionStatus = await PushNotifications.requestPermissions();
      this.permissionSignal.set(permission.receive === 'granted' ? 'granted' : 'denied');
      if (permission.receive !== 'granted') return;

      await PushNotifications.register();

      PushNotifications.addListener('registration', () => {
        // The device token would be sent to the API here (e.g.
        // POST /users/me/push-tokens) once that endpoint exists server-side.
      });

      PushNotifications.addListener('pushNotificationReceived', (_notification: PushNotificationSchema) => {
        // Foreground notification received — DineScout shows in-app UI
        // rather than relying on the OS banner while the app is open.
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        const restaurantId = action.notification.data?.['restaurantId'] as string | undefined;
        if (restaurantId) void this.router.navigate(['/restaurants', restaurantId]);
      });
    } catch {
      this.permissionSignal.set('denied');
    }
  }
}
