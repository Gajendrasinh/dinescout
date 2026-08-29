import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonInput } from '@ionic/angular';
import { AppError } from '../../../core/interceptors/error.interceptor';
import { AuthService } from '../../../core/services/auth.service';
import { FavoritesService } from '../../../core/services/favorites.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, IonContent, IonButton, IonInput],
  templateUrl: './login.page.html',
  styleUrl: '../auth.shared.scss',
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly favorites = inject(FavoritesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    try {
      await this.auth.login(this.form.getRawValue());
      await this.favorites.bootstrap();
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/tabs/home';
      void this.router.navigateByUrl(returnUrl);
    } catch (error) {
      this.errorMessage.set((error as AppError).message ?? 'Unable to log in. Please try again.');
    } finally {
      this.submitting.set(false);
    }
  }
}
