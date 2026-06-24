import type { Location } from '../types';

export interface GeolocationProvider {
  getLocationFromIp(ip: string): Promise<Location>;
}

export class MockGeolocationProvider implements GeolocationProvider {
  async getLocationFromIp(ip: string): Promise<Location> {
    const mockLocations: Location[] = [
      { city: 'San Francisco', state: 'CA', country: 'US', timezone: 'America/Los_Angeles' },
      { city: 'New York', state: 'NY', country: 'US', timezone: 'America/New_York' },
      { city: 'London', state: '', country: 'GB', timezone: 'Europe/London' },
      { city: 'Toronto', state: 'ON', country: 'CA', timezone: 'America/Toronto' },
      { city: 'Sydney', state: 'NSW', country: 'AU', timezone: 'Australia/Sydney' },
      { city: 'Berlin', state: '', country: 'DE', timezone: 'Europe/Berlin' },
    ];
    const hash = ip.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return mockLocations[hash % mockLocations.length];
  }
}

export type { Location };