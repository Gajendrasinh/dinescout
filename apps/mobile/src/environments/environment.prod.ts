export const environment = {
  production: true,
  // Overridden at build/deploy time via API_BASE_URL — see DEPLOYMENT.md.
  apiBaseUrl: 'https://api.dinescout.app/api/v1',
  appName: 'DineScout',
  defaultCity: 'Singapore',
  defaultCoordinates: { lat: 1.3521, lng: 103.8198 }, // Singapore
  // Set at build time (see DEPLOYMENT.md) to enable GoogleMapsProvider;
  // left empty here so an unconfigured build still runs correctly.
  mapApiKey: '',
};
