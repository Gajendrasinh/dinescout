import { Component, OnInit, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { AuthService } from './core/services/auth.service';
import { DeepLinkService } from './core/services/deep-link.service';
import { FavoritesService } from './core/services/favorites.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly favorites = inject(FavoritesService);
  private readonly deepLinks = inject(DeepLinkService);

  async ngOnInit(): Promise<void> {
    this.deepLinks.init();
    await this.auth.bootstrap();
    await this.favorites.bootstrap();
  }
}
