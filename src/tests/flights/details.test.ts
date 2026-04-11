import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FlightTools } from '../../mcp/tools/flights.js';
import { mockFlightOffer } from '../setup.js';

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

describe('Flight Details - Comprehensive Tests', () => {
  let flightTools: FlightTools;
  let mockDuffelClient: any;

  beforeEach(() => {
    flightTools = new FlightTools();
    mockDuffelClient = (flightTools as any).duffelClient;
  });

  describe('Offer Detail Retrieval', () => {
    it('should get details for simple one-way offer', async () => {
      mockDuffelClient.getFlightOffer.mockResolvedValue(mockFlightOffer);

      const result = await flightTools.getFlightDetails({
        offer_id: 'off_simple_123'
      });

      expect(mockDuffelClient.getFlightOffer).toHaveBeenCalledWith('off_simple_123');
      expect(result.content[0].text).toContain('"success": true');
      expect(result.content[0].text).toContain('off_mock_123');
    });

    it('should get details for round-trip offer', async () => {
      const roundTripOffer = {
        ...mockFlightOffer,
        slices: [
          mockFlightOffer.slices[0],
          {
            ...mockFlightOffer.slices[0],
            id: 'sli_return_123',
            origin: mockFlightOffer.slices[0].destination,
            destination: mockFlightOffer.slices[0].origin,
            segments: [{
              ...mockFlightOffer.slices[0].segments[0],
              id: 'seg_return_123',
              departing_at: '2024-07-20T10:00:00Z',
              arriving_at: '2024-07-20T13:30:00Z'
            }]
          }
        ]
      };

      mockDuffelClient.getFlightOffer.mockResolvedValue(roundTripOffer);

      const result = await flightTools.getFlightDetails({
        offer_id: 'off_roundtrip_123'
      });

      expect(result.content[0].text).toContain('sli_return_123');
      expect(result.content[0].text).toContain('seg_return_123');
    });

    it('should get details for multi-segment offer', async () => {
      const multiSegmentOffer = {
        ...mockFlightOffer,
        slices: [{
          ...mockFlightOffer.slices[0],
          segments: [
            mockFlightOffer.slices[0].segments[0],
            {
              id: 'seg_connecting_123',
              aircraft: { name: 'Airbus A320' },
              departing_at: '2024-07-15T18:00:00Z',
              arriving_at: '2024-07-15T20:30:00Z',
              origin: {
                id: 'arp_ord_us',
                iata_code: 'ORD'
              },
              destination: {
                id: 'arp_jfk_us',
                iata_code: 'JFK'
              },
              marketing_carrier: {
                id: 'arl_mock',
                name: 'Mock Airlines'
              }
            }
          ]
        }]
      };

      mockDuffelClient.getFlightOffer.mockResolvedValue(multiSegmentOffer);

      const result = await flightTools.getFlightDetails({
        offer_id: 'off_multisegment_123'
      });

      expect(result.content[0].text).toContain('seg_connecting_123');
      expect(result.content[0].text).toContain('ORD');
    });
  });

  describe('Offer Detail Variations', () => {
    it('should handle offers with different aircraft types', async () => {
      const aircraftVariations = [
        'Boeing 737',
        'Airbus A320',
        'Boeing 777',
        'Airbus A350',
        'Boeing 787',
        'Embraer E175',
        'Bombardier CRJ900'
      ];

      for (const aircraft of aircraftVariations) {
        const offer = {
          ...mockFlightOffer,
          slices: [{
            ...mockFlightOffer.slices[0],
            segments: [{
              ...mockFlightOffer.slices[0].segments[0],
              aircraft: { name: aircraft }
            }]
          }]
        };

        mockDuffelClient.getFlightOffer.mockResolvedValue(offer);

        const result = await flightTools.getFlightDetails({
          offer_id: `off_${aircraft.replace(/\s+/g, '_').toLowerCase()}_123`
        });

        expect(result.content[0].text).toContain(aircraft);
      }
    });

    it('should handle offers with different price ranges', async () => {
      const priceTestCases = [
        { amount: '99.00', description: 'budget flight' },
        { amount: '299.00', description: 'economy flight' },
        { amount: '899.00', description: 'business flight' },
        { amount: '2499.00', description: 'first class flight' },
        { amount: '5999.00', description: 'premium international' }
      ];

      for (const { amount, description } of priceTestCases) {
        const offer = {
          ...mockFlightOffer,
          total_amount: amount
        };

        mockDuffelClient.getFlightOffer.mockResolvedValue(offer);

        const result = await flightTools.getFlightDetails({
          offer_id: `off_${description.replace(/\s+/g, '_')}_123`
        });

        expect(result.content[0].text).toContain(amount);
      }
    });

    it('should handle offers with different currencies', async () => {
      const currencyTestCases = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'];

      for (const currency of currencyTestCases) {
        const offer = {
          ...mockFlightOffer,
          total_currency: currency,
          tax_currency: currency
        };

        mockDuffelClient.getFlightOffer.mockResolvedValue(offer);

        const result = await flightTools.getFlightDetails({
          offer_id: `off_${currency.toLowerCase()}_123`
        });

        expect(result.content[0].text).toContain(currency);
      }
    });

    it('should handle offers with different durations', async () => {
      const durationTestCases = [
        { duration: 'PT1H30M', description: 'short domestic' },
        { duration: 'PT3H45M', description: 'medium domestic' },
        { duration: 'PT6H15M', description: 'cross-country' },
        { duration: 'PT11H30M', description: 'transatlantic' },
        { duration: 'PT15H45M', description: 'transpacific' }
      ];

      for (const { duration, description } of durationTestCases) {
        const offer = {
          ...mockFlightOffer,
          slices: [{
            ...mockFlightOffer.slices[0],
            duration
          }]
        };

        mockDuffelClient.getFlightOffer.mockResolvedValue(offer);

        const result = await flightTools.getFlightDetails({
          offer_id: `off_${description.replace(/\s+/g, '_')}_123`
        });

        expect(result.content[0].text).toContain(duration);
      }
    });
  });

  describe('Airline and Carrier Variations', () => {
    const airlineTestCases = [
      { id: 'arl_american', name: 'American Airlines' },
      { id: 'arl_delta', name: 'Delta Air Lines' },
      { id: 'arl_united', name: 'United Airlines' },
      { id: 'arl_southwest', name: 'Southwest Airlines' },
      { id: 'arl_jetblue', name: 'JetBlue Airways' },
      { id: 'arl_lufthansa', name: 'Lufthansa' },
      { id: 'arl_british_airways', name: 'British Airways' },
      { id: 'arl_air_france', name: 'Air France' }
    ];

    it.each(airlineTestCases)('should handle $name carrier', async ({ id, name }) => {
      const offer = {
        ...mockFlightOffer,
        owner: { id, name },
        slices: [{
          ...mockFlightOffer.slices[0],
          segments: [{
            ...mockFlightOffer.slices[0].segments[0],
            marketing_carrier: { id, name }
          }]
        }]
      };

      mockDuffelClient.getFlightOffer.mockResolvedValue(offer);

      const result = await flightTools.getFlightDetails({
        offer_id: `off_${id}_123`
      });

      expect(result.content[0].text).toContain(name);
    });
  });

  describe('Error Handling', () => {
    it('should handle offer not found', async () => {
      mockDuffelClient.getFlightOffer.mockRejectedValue(new Error('Offer not found'));

      const result = await flightTools.getFlightDetails({
        offer_id: 'off_nonexistent_123'
      });

      expect(result.content[0].text).toContain('"success": false');
      expect(result.content[0].text).toContain('Offer not found');
    });

    it('should handle expired offers', async () => {
      mockDuffelClient.getFlightOffer.mockRejectedValue(new Error('Offer has expired'));

      const result = await flightTools.getFlightDetails({
        offer_id: 'off_expired_123'
      });

      expect(result.content[0].text).toContain('"success": false');
      expect(result.content[0].text).toContain('expired');
    });

    it('should handle malformed offer IDs', async () => {
      const malformedIds = [
        '',
        'invalid',
        'off_',
        'not_an_offer_id',
        'off_with_special_chars!@#',
        'way_too_long_offer_id_that_exceeds_normal_limits_123456789'
      ];

      for (const offerId of malformedIds) {
        mockDuffelClient.getFlightOffer.mockRejectedValue(new Error('Invalid offer ID format'));

        const result = await flightTools.getFlightDetails({
          offer_id: offerId
        });

        expect(result.content[0].text).toContain('"success": false');
      }
    });

    it('should handle API service unavailable', async () => {
      mockDuffelClient.getFlightOffer.mockRejectedValue(new Error('Service temporarily unavailable'));

      const result = await flightTools.getFlightDetails({
        offer_id: 'off_service_down_123'
      });

      expect(result.content[0].text).toContain('"success": false');
      expect(result.content[0].text).toContain('temporarily unavailable');
    });

    it('should handle authorization errors', async () => {
      mockDuffelClient.getFlightOffer.mockRejectedValue(new Error('Unauthorized access'));

      const result = await flightTools.getFlightDetails({
        offer_id: 'off_unauthorized_123'
      });

      expect(result.content[0].text).toContain('"success": false');
      expect(result.content[0].text).toContain('Unauthorized');
    });
  });

  describe('Complex Offer Structures', () => {
    it('should handle codeshare flights', async () => {
      const codeshareOffer = {
        ...mockFlightOffer,
        slices: [{
          ...mockFlightOffer.slices[0],
          segments: [{
            ...mockFlightOffer.slices[0].segments[0],
            marketing_carrier: {
              id: 'arl_marketing',
              name: 'Marketing Airline'
            },
            operating_carrier: {
              id: 'arl_operating',
              name: 'Operating Airline'
            }
          }]
        }]
      };

      mockDuffelClient.getFlightOffer.mockResolvedValue(codeshareOffer);

      const result = await flightTools.getFlightDetails({
        offer_id: 'off_codeshare_123'
      });

      expect(result.content[0].text).toContain('Marketing Airline');
      expect(result.content[0].text).toContain('Operating Airline');
    });

    it('should handle red-eye flights', async () => {
      const redeyeOffer = {
        ...mockFlightOffer,
        slices: [{
          ...mockFlightOffer.slices[0],
          segments: [{
            ...mockFlightOffer.slices[0].segments[0],
            departing_at: '2024-07-15T23:30:00Z',
            arriving_at: '2024-07-16T07:15:00Z'
          }]
        }]
      };

      mockDuffelClient.getFlightOffer.mockResolvedValue(redeyeOffer);

      const result = await flightTools.getFlightDetails({
        offer_id: 'off_redeye_123'
      });

      expect(result.content[0].text).toContain('23:30');
      expect(result.content[0].text).toContain('07:15');
    });

    it('should handle long layovers', async () => {
      const longLayoverOffer = {
        ...mockFlightOffer,
        slices: [{
          ...mockFlightOffer.slices[0],
          segments: [
            {
              ...mockFlightOffer.slices[0].segments[0],
              arriving_at: '2024-07-15T12:00:00Z'
            },
            {
              ...mockFlightOffer.slices[0].segments[0],
              id: 'seg_layover_123',
              departing_at: '2024-07-15T20:00:00Z', // 8-hour layover
              arriving_at: '2024-07-15T23:30:00Z'
            }
          ]
        }]
      };

      mockDuffelClient.getFlightOffer.mockResolvedValue(longLayoverOffer);

      const result = await flightTools.getFlightDetails({
        offer_id: 'off_long_layover_123'
      });

      expect(result.content[0].text).toContain('seg_layover_123');
    });
  });
});