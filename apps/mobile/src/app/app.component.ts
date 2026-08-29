import { Component, OnInit, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { DeepLinkService } from './core/services/deep-link.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  private readonly deepLinks = inject(DeepLinkService);

  ngOnInit(): void {
    // Auth/favorites bootstrap runs earlier, via provideAppInitializer in
    // app.config.ts — see the comment there for why it can't live here.
    this.deepLinks.init();
  }
}
