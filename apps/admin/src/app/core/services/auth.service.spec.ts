import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { AuthService, NotAdminError } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('rejects login for a plain USER account, without storing tokens', async () => {
    const loginPromise = service.login({ email: 'user@example.test', password: 'x' });

    httpMock.expectOne(`${environment.apiBaseUrl}/auth/login`).flush({
      data: {
        user: { id: 'u1', email: 'user@example.test', displayName: 'User', role: 'USER' },
        tokens: { accessToken: 'a', refreshToken: 'r', expiresIn: 900 },
      },
    });

    await expectAsync(loginPromise).toBeRejectedWith(jasmine.any(NotAdminError));
    expect(service.getAccessToken()).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
  });

  it('accepts login for an ADMIN account and marks isAdmin/canModerate', async () => {
    const loginPromise = service.login({ email: 'admin@example.test', password: 'x' });

    httpMock.expectOne(`${environment.apiBaseUrl}/auth/login`).flush({
      data: {
        user: { id: 'u2', email: 'admin@example.test', displayName: 'Admin', role: 'ADMIN' },
        tokens: { accessToken: 'a', refreshToken: 'r', expiresIn: 900 },
      },
    });

    await loginPromise;
    expect(service.isLoggedIn()).toBe(true);
    expect(service.isAdmin()).toBe(true);
    expect(service.canModerate()).toBe(true);
    expect(service.getAccessToken()).toBe('a');
  });

  it('accepts login for a MODERATOR account but isAdmin stays false', async () => {
    const loginPromise = service.login({ email: 'mod@example.test', password: 'x' });

    httpMock.expectOne(`${environment.apiBaseUrl}/auth/login`).flush({
      data: {
        user: { id: 'u3', email: 'mod@example.test', displayName: 'Mod', role: 'MODERATOR' },
        tokens: { accessToken: 'a', refreshToken: 'r', expiresIn: 900 },
      },
    });

    await loginPromise;
    expect(service.isAdmin()).toBe(false);
    expect(service.canModerate()).toBe(true);
  });
});
