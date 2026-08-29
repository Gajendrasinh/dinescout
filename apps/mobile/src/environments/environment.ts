export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000/api/v1',
  appName: 'DineScout',
  defaultCity: 'Singapore',
  defaultCoordinates: { lat: 1.3521, lng: 103.8198 }, // Singapore
  // Leave empty to run the app with the built-in list-based map fallback
  // (StaticMapProvider) instead of Google Maps — see MapService.
  mapApiKey: '',
};
