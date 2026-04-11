import { beforeAll, afterAll, beforeEach, vi } from 'vitest';

// Mock environment variables for testing
beforeAll(() => {
  process.env.DUFFEL_ACCESS_TOKEN = 'duffel_test_mock_token';
  process.env.AMADEUS_CLIENT_ID = 'mock_client_id';
  process.env.AMADEUS_CLIENT_SECRET = 'mock_client_secret';
});

// Reset mocks before each test
beforeEach(() => {
  // Clear any previous mocks
  vi.clearAllMocks();
});

// Global test utilities
export const mockFlightOffer = {
  id: 'off_mock_123',
  owner: {
    id: 'arl_mock_airline',
    name: 'Mock Airlines',
  },
  slices: [
    {
      id: 'sli_mock_123',
      origin: {
        id: 'arp_lax_us',
        city_name: 'Los Angeles',
        iata_code: 'LAX',
      },
      destination: {
        id: 'arp_jfk_us',
        city_name: 'New York',
        iata_code: 'JFK',
      },
      duration: 'PT5H30M',
      segments: [
        {
          id: 'seg_mock_123',
          aircraft: { name: 'Boeing 737' },
          departing_at: '2024-07-15T08:00:00Z',
          arriving_at: '2024-07-15T16:30:00Z',
          origin: {
            id: 'arp_lax_us',
            iata_code: 'LAX',
          },
          destination: {
            id: 'arp_jfk_us',
            iata_code: 'JFK',
          },
          marketing_carrier: {
            id: 'arl_mock',
            name: 'Mock Airlines',
          },
        },
      ],
    },
  ],
  passengers: [
    {
      id: 'pas_mock_123',
      type: 'adult',
    },
  ],
  total_amount: '299.00',
  total_currency: 'USD',
  tax_amount: '29.00',
  tax_currency: 'USD',
};

export const mockPassenger = {
  given_name: 'John',
  family_name: 'Doe',
  email: 'john.doe@example.com',
  phone_number: '+1234567890',
  born_on: '1990-01-01',
  title: 'mr' as const,
  gender: 'm' as const,
};

export const mockHotelProperty = {
  id: 'pro_mock_123',
  name: 'Mock Hotel',
  description: 'A great test hotel',
  location: {
    latitude: 40.7128,
    longitude: -74.006,
  },
  amenities: ['wifi', 'gym'],
  photos: [],
};

export const mockHotelRate = {
  id: 'rat_mock_123',
  total_amount: '150.00',
  total_currency: 'USD',
  check_in_date: '2024-07-15',
  check_out_date: '2024-07-16',
};
