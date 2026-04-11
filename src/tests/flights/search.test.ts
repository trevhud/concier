import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FlightTools } from '../../mcp/tools/flights.js';
import { mockFlightOffer } from '../setup.js';

// Mock the Duffel SDK
vi.mock('../../services/duffel/flight-client.js', () => {
  return {
    DuffelSDKClient: vi.fn().mockImplementation(() => ({
      searchFlights: vi.fn(),
      getFlightOffer: vi.fn(),
      holdFlight: vi.fn(),
      createThreeDSecureSession: vi.fn(),
      createPaymentWithCard: vi.fn(),
      bookFlightWithCard: vi.fn()
    }))
  };
});

describe('Flight Search - Trip Types', () => {
  let flightTools: FlightTools;
  let mockDuffelClient: any;

  beforeEach(() => {
    flightTools = new FlightTools();
    mockDuffelClient = (flightTools as any).duffelClient;
  });

  describe('One-Way Flights', () => {
    it('should search for one-way domestic flights', async () => {
      const mockResponse = {
        offers: [mockFlightOffer],
        meta: { count: 1 }
      };
      mockDuffelClient.searchFlights.mockResolvedValue(mockResponse);

      const result = await flightTools.searchFlights({
        origin: 'LAX',
        destination: 'JFK',
        departure_date: '2024-07-15',
        adults: 1,
        cabin_class: 'economy'
      });

      expect(mockDuffelClient.searchFlights).toHaveBeenCalledWith({
        origin: 'LAX',
        destination: 'JFK', 
        departure_date: '2024-07-15',
        adults: 1,
        cabin_class: 'economy'
      });

      expect(result.content[0].text).toContain('Found 1 flight offers');
      expect(result.content[0].text).toContain('"success": true');
    });

    it('should search for one-way international flights', async () => {
      const mockResponse = {
        offers: [
          {
            ...mockFlightOffer,
            slices: [{
              ...mockFlightOffer.slices[0],
              origin: { id: 'arp_lax_us', city_name: 'Los Angeles', iata_code: 'LAX' },
              destination: { id: 'arp_lhr_gb', city_name: 'London', iata_code: 'LHR' },
              duration: 'PT11H0M'
            }]
          }
        ],
        meta: { count: 1 }
      };
      mockDuffelClient.searchFlights.mockResolvedValue(mockResponse);

      const result = await flightTools.searchFlights({
        origin: 'LAX',
        destination: 'LHR',
        departure_date: '2024-07-15',
        adults: 1,
        cabin_class: 'economy'
      });

      expect(result.content[0].text).toContain('Found 1 flight offers');
    });
  });

  describe('Round-Trip Flights', () => {
    it('should search for round-trip domestic flights', async () => {
      const mockRoundTripOffer = {
        ...mockFlightOffer,
        slices: [
          mockFlightOffer.slices[0],
          {
            ...mockFlightOffer.slices[0],
            origin: mockFlightOffer.slices[0].destination,
            destination: mockFlightOffer.slices[0].origin,
            segments: [{
              ...mockFlightOffer.slices[0].segments[0],
              departing_at: '2024-07-20T10:00:00Z',
              arriving_at: '2024-07-20T13:30:00Z'
            }]
          }
        ]
      };

      const mockResponse = {
        offers: [mockRoundTripOffer],
        meta: { count: 1 }
      };
      mockDuffelClient.searchFlights.mockResolvedValue(mockResponse);

      const result = await flightTools.searchFlights({
        origin: 'LAX',
        destination: 'JFK',
        departure_date: '2024-07-15',
        return_date: '2024-07-20',
        adults: 1,
        cabin_class: 'economy'
      });

      expect(mockDuffelClient.searchFlights).toHaveBeenCalledWith({
        origin: 'LAX',
        destination: 'JFK',
        departure_date: '2024-07-15',
        return_date: '2024-07-20',
        adults: 1,
        cabin_class: 'economy'
      });

      expect(result.content[0].text).toContain('Found 1 flight offers');
    });

    it('should search for round-trip international flights', async () => {
      const mockResponse = {
        offers: [mockFlightOffer],
        meta: { count: 1 }
      };
      mockDuffelClient.searchFlights.mockResolvedValue(mockResponse);

      const result = await flightTools.searchFlights({
        origin: 'JFK',
        destination: 'CDG',
        departure_date: '2024-08-01',
        return_date: '2024-08-15',
        adults: 2,
        cabin_class: 'business'
      });

      expect(result.content[0].text).toContain('Found 1 flight offers');
    });
  });

  describe('Cabin Classes', () => {
    it.each([
      'economy',
      'business', 
      'first'
    ])('should search for %s class flights', async (cabinClass) => {
      const mockResponse = {
        offers: [mockFlightOffer],
        meta: { count: 1 }
      };
      mockDuffelClient.searchFlights.mockResolvedValue(mockResponse);

      const result = await flightTools.searchFlights({
        origin: 'LAX',
        destination: 'JFK',
        departure_date: '2024-07-15',
        adults: 1,
        cabin_class: cabinClass
      });

      expect(mockDuffelClient.searchFlights).toHaveBeenCalledWith(
        expect.objectContaining({
          cabin_class: cabinClass
        })
      );
    });
  });

  describe('Passenger Variations', () => {
    it.each([
      { adults: 1, description: 'single adult' },
      { adults: 2, description: 'couple' },
      { adults: 4, description: 'family of four' },
      { adults: 6, description: 'large group' },
      { adults: 9, description: 'maximum passengers' }
    ])('should search flights for $description ($adults adults)', async ({ adults }) => {
      const mockResponse = {
        offers: [mockFlightOffer],
        meta: { count: 1 }
      };
      mockDuffelClient.searchFlights.mockResolvedValue(mockResponse);

      const result = await flightTools.searchFlights({
        origin: 'LAX',
        destination: 'JFK', 
        departure_date: '2024-07-15',
        adults,
        cabin_class: 'economy'
      });

      expect(mockDuffelClient.searchFlights).toHaveBeenCalledWith(
        expect.objectContaining({
          adults
        })
      );
    });
  });

  describe('Date Variations', () => {
    it('should search for flights with near-future dates', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const mockResponse = {
        offers: [mockFlightOffer],
        meta: { count: 1 }
      };
      mockDuffelClient.searchFlights.mockResolvedValue(mockResponse);

      const result = await flightTools.searchFlights({
        origin: 'LAX',
        destination: 'JFK',
        departure_date: dateStr,
        adults: 1,
        cabin_class: 'economy'
      });

      expect(result.content[0].text).toContain('Found 1 flight offers');
    });

    it('should search for flights with far-future dates', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const dateStr = futureDate.toISOString().split('T')[0];

      const mockResponse = {
        offers: [mockFlightOffer],
        meta: { count: 1 }
      };
      mockDuffelClient.searchFlights.mockResolvedValue(mockResponse);

      const result = await flightTools.searchFlights({
        origin: 'LAX',
        destination: 'JFK',
        departure_date: dateStr,
        adults: 1,
        cabin_class: 'economy'
      });

      expect(result.content[0].text).toContain('Found 1 flight offers');
    });
  });

  describe('Popular Route Combinations', () => {
    const popularRoutes = [
      { origin: 'LAX', destination: 'JFK', description: 'Los Angeles to New York' },
      { origin: 'SFO', destination: 'LAX', description: 'San Francisco to Los Angeles' },
      { origin: 'JFK', destination: 'LHR', description: 'New York to London' },
      { origin: 'LAX', destination: 'NRT', description: 'Los Angeles to Tokyo' },
      { origin: 'MIA', destination: 'CDG', description: 'Miami to Paris' },
      { origin: 'DFW', destination: 'FRA', description: 'Dallas to Frankfurt' },
      { origin: 'SEA', destination: 'AMS', description: 'Seattle to Amsterdam' },
      { origin: 'ORD', destination: 'FCO', description: 'Chicago to Rome' }
    ];

    it.each(popularRoutes)('should search $description route', async ({ origin, destination }) => {
      const mockResponse = {
        offers: [mockFlightOffer],
        meta: { count: 1 }
      };
      mockDuffelClient.searchFlights.mockResolvedValue(mockResponse);

      const result = await flightTools.searchFlights({
        origin,
        destination,
        departure_date: '2024-07-15',
        adults: 1,
        cabin_class: 'economy'
      });

      expect(mockDuffelClient.searchFlights).toHaveBeenCalledWith(
        expect.objectContaining({
          origin,
          destination
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockDuffelClient.searchFlights.mockRejectedValue(new Error('API Error'));

      const result = await flightTools.searchFlights({
        origin: 'LAX',
        destination: 'JFK',
        departure_date: '2024-07-15',
        adults: 1,
        cabin_class: 'economy'
      });

      expect(result.content[0].text).toContain('"success": false');
      expect(result.content[0].text).toContain('API Error');
    });

    it('should handle invalid airport codes', async () => {
      mockDuffelClient.searchFlights.mockRejectedValue(new Error('Invalid airport code'));

      const result = await flightTools.searchFlights({
        origin: 'INVALID',
        destination: 'ALSO_INVALID', 
        departure_date: '2024-07-15',
        adults: 1,
        cabin_class: 'economy'
      });

      expect(result.content[0].text).toContain('"success": false');
    });

    it('should handle no results found', async () => {
      const mockResponse = {
        offers: [],
        meta: { count: 0 }
      };
      mockDuffelClient.searchFlights.mockResolvedValue(mockResponse);

      const result = await flightTools.searchFlights({
        origin: 'LAX',
        destination: 'JFK',
        departure_date: '2024-07-15',
        adults: 1,
        cabin_class: 'economy'
      });

      expect(result.content[0].text).toContain('Found 0 flight offers');
    });
  });
});