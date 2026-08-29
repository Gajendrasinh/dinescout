import { Component } from '@angular/core';
import {
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from '@ionic/angular';

/** Bottom tab shell: Home / Search / Map / Favorites / Profile. Every
 *  other route (restaurant details, menu, reviews, AI chat, auth) is
 *  pushed on top of this stack full-screen, without the tab bar. */
@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonRouterOutlet],
  template: `
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="home" href="/tabs/home">
          <ion-icon name="home-outline" aria-hidden="true"></ion-icon>
          <ion-label>Home</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="search" href="/tabs/search">
          <ion-icon name="search-outline" aria-hidden="true"></ion-icon>
          <ion-label>Search</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="map" href="/tabs/map">
          <ion-icon name="map-outline" aria-hidden="true"></ion-icon>
          <ion-label>Map</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="favorites" href="/tabs/favorites">
          <ion-icon name="heart-outline" aria-hidden="true"></ion-icon>
          <ion-label>Favorites</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="profile" href="/tabs/profile">
          <ion-icon name="person-outline" aria-hidden="true"></ion-icon>
          <ion-label>Profile</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
})
export class TabsPage {}
