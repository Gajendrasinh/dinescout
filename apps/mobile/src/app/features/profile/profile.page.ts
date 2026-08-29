import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonIcon],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss',
})
export class ProfilePage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly user = computed(() => this.auth.currentUser());
  readonly isLoggedIn = computed(() => this.auth.isLoggedIn());

  goToLogin(): void {
    void this.router.navigate(['/auth/login']);
  }

  goToPreferences(): void {
    void this.router.navigate(['/profile/preferences']);
  }

  goToAiChat(): void {
    void this.router.navigate(['/ai-chat']);
  }

  async logout(): Promise<void> {
    await this.auth.logout();
  }
}
