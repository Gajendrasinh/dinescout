import { Injectable } from '@angular/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { Network } from '@capacitor/network';

/**
 * Thin wrappers around the Capacitor plugins used for native touches
 * (haptics, native share sheet, network status). Each method is a no-op-
 * safe try/catch — these plugins degrade gracefully on web, but a wrapper
 * keeps feature code from needing to know that.
 */
@Injectable({ providedIn: 'root' })
export class NativeService {
  async lightTap(): Promise<void> {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Haptics unavailable (web/unsupported device) — ignore.
    }
  }

  async share(options: { title: string; text?: string; url?: string }): Promise<void> {
    try {
      await Share.share(options);
    } catch {
      // User cancelled the share sheet, or it isn't available — ignore.
    }
  }

  async isOnline(): Promise<boolean> {
    try {
      const status = await Network.getStatus();
      return status.connected;
    } catch {
      return true; // assume online if the plugin can't answer
    }
  }
}
