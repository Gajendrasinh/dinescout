import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonInput } from '@ionic/angular';
import { AppError } from '../../../core/interceptors/error.interceptor';
import { AuthService } from '../../../core/services/auth.service';
import { FavoritesService } from '../../../core/services/favorites.service';

const PASSWORD_PATTERN = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, IonContent, IonButton, IonInput],
  templateUrl: './register.page.html',
  styleUrl: '../auth.shared.scss',
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly favorites = inject(FavoritesService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    displayName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email]],
    password: [
      '',
      [Validators.required, Validators.minLength(8), Validators.pattern(PASSWORD_PATTERN)],
    ],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    try {
      await this.auth.register(this.form.getRawValue());
      await this.favorites.bootstrap();
      void this.router.navigateByUrl('/tabs/home');
    } catch (error) {
      this.errorMessage.set(
        (error as AppError).message ?? 'Unable to create your account. Please try again.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
