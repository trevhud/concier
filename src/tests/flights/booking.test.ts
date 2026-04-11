import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FlightTools } from '../../mcp/tools/flights.js';
import { mockFlightOffer, mockPassenger } from '../setup.js';

vi.mock('../../services/duffel/flight-client.js', () => {
  return {
    DuffelSDKClient: vi.fn().mockImplementation(() => ({
      searchFlights: vi.fn(),
      getFlightOffer: vi.fn(),
      holdFlight: vi.fn(),
      bookFlightInstant: vi.fn(),
      createPayment: vi.fn(),
      cancelOrder: vi.fn()
    }))
  };
});

describe('Flight Booking - Comprehensive Tests', () => {
  let flightTools: FlightTools;
  let mockDuffelClient: any;

  beforeEach(() => {
    flightTools = new FlightTools();
    mockDuffelClient = (flightTools as any).duffelClient;
  });

  describe('Passenger Variations', () => {
    const passengerTitles = ['mr', 'ms', 'mrs', 'dr'] as const;
    const genders = ['m', 'f'] as const;

    it.each(passengerTitles)('should book flight with %s title', async (title) => {
      const mockBookingResponse = {
        id: 'ord_mock_123',
        booking_reference: 'MOCK123'
      };
      mockDuffelClient.holdFlight.mockResolvedValue(mockBookingResponse);

      const passenger = { ...mockPassenger, title };

      const result = await flightTools.bookFlight({
        offer_id: 'off_mock_123',
        passenger
      });

      expect(mockDuffelClient.holdFlight).toHaveBeenCalledWith('off_mock_123', passenger);

      expect(result.content[0].text).toContain('"success": true');
      expect(result.content[0].text).toContain('MOCK123');
    });

    it.each(genders)('should book flight with gender %s', async (gender) => {
      const mockBookingResponse = {
        id: 'ord_mock_123',
        booking_reference: 'MOCK123'
      };
      mockDuffelClient.holdFlight.mockResolvedValue(mockBookingResponse);

      const passenger = { ...mockPassenger, gender };

      const result = await flightTools.bookFlight({
        offer_id: 'off_mock_123',
        passenger
      });

      expect(result.content[0].text).toContain('"success": true');
    });

    describe('Age Variations', () => {
      const ageTestCases = [
        { born_on: '2006-01-01', description: 'young adult (18)' },
        { born_on: '1990-01-01', description: 'adult (34)' },
        { born_on: '1970-01-01', description: 'middle-aged (54)' },
        { born_on: '1950-01-01', description: 'senior (74)' },
        { born_on: '1940-01-01', description: 'elderly (84)' }
      ];

      it.each(ageTestCases)('should book flight for $description', async ({ born_on }) => {
        const mockBookingResponse = {
          id: 'ord_mock_123',
          booking_reference: 'MOCK123',
          documents: []
        };
        mockDuffelClient.holdFlight.mockResolvedValue(mockBookingResponse);

        const passenger = { ...mockPassenger, born_on };

        const result = await flightTools.bookFlight({
          offer_id: 'off_mock_123',
          passenger
        });

        expect(result.content[0].text).toContain('"success": true');
      });
    });

    describe('International Name Variations', () => {
      const nameTestCases = [
        { given_name: 'José', family_name: 'García', description: 'Spanish names with accents' },
        { given_name: 'François', family_name: 'Müller', description: 'French/German names' },
        { given_name: 'Александр', family_name: 'Петров', description: 'Cyrillic names' },
        { given_name: '田中', family_name: '太郎', description: 'Japanese names' },
        { given_name: 'محمد', family_name: 'أحمد', description: 'Arabic names' },
        { given_name: 'O\'Connor', family_name: 'D\'Angelo', description: 'Names with apostrophes' },
        { given_name: 'van der Berg', family_name: 'de la Cruz', description: 'Names with particles' }
      ];

      it.each(nameTestCases)('should book flight with $description', async ({ given_name, family_name }) => {
        const mockBookingResponse = {
          id: 'ord_mock_123',
          booking_reference: 'MOCK123',
          documents: []
        };
        mockDuffelClient.holdFlight.mockResolvedValue(mockBookingResponse);

        const passenger = { ...mockPassenger, given_name, family_name };

        const result = await flightTools.bookFlight({
          offer_id: 'off_mock_123',
          passenger
        });

        expect(result.content[0].text).toContain('"success": true');
      });
    });

    describe('Contact Information Variations', () => {
      const contactTestCases = [
        { 
          email: 'user@gmail.com',
          phone_number: '+1234567890',
          description: 'standard US format'
        },
        {
          email: 'test.user+tag@domain.co.uk',
          phone_number: '+44207123456',
          description: 'UK format with email tag'
        },
        {
          email: 'user@subdomain.example.org',
          phone_number: '+49301234567',
          description: 'German format'
        },
        {
          email: 'user.name@company-name.com',
          phone_number: '+81312345678',
          description: 'Japanese format'
        },
        {
          email: 'firstname_lastname@university.edu',
          phone_number: '+61298765432',
          description: 'Australian format'
        }
      ];

      it.each(contactTestCases)('should book flight with $description', async ({ email, phone_number }) => {
        const mockBookingResponse = {
          id: 'ord_mock_123',
          booking_reference: 'MOCK123',
          documents: []
        };
        mockDuffelClient.holdFlight.mockResolvedValue(mockBookingResponse);

        const passenger = { ...mockPassenger, email, phone_number };

        const result = await flightTools.bookFlight({
          offer_id: 'off_mock_123',
          passenger
        });

        expect(result.content[0].text).toContain('"success": true');
      });
    });
  });

  describe('Offer Variations', () => {
    const offerTestCases = [
      { offer_id: 'off_short123', description: 'short offer ID' },
      { offer_id: 'off_very_long_offer_id_with_underscores_123456789', description: 'long offer ID' },
      { offer_id: 'off-with-dashes-123', description: 'offer ID with dashes' },
      { offer_id: 'OFF_UPPERCASE_123', description: 'uppercase offer ID' }
    ];

    it.each(offerTestCases)('should book flight with $description', async ({ offer_id }) => {
      const mockBookingResponse = {
        id: 'ord_mock_123',
        booking_reference: 'MOCK123'
      };
      mockDuffelClient.holdFlight.mockResolvedValue(mockBookingResponse);

      const result = await flightTools.bookFlight({
        offer_id,
        passenger: mockPassenger
      });

      expect(mockDuffelClient.holdFlight).toHaveBeenCalledWith(offer_id, mockPassenger);
    });
  });

  describe('Booking Response Variations', () => {
    it('should handle booking with documents', async () => {
      const mockBookingResponse = {
        id: 'ord_mock_123',
        booking_reference: 'MOCK123',
        documents: [
          {
            type: 'eticket',
            url: 'https://example.com/ticket.pdf'
          }
        ]
      };
      mockDuffelClient.holdFlight.mockResolvedValue(mockBookingResponse);

      const result = await flightTools.bookFlight({
        offer_id: 'off_mock_123',
        passenger: mockPassenger
      });

      expect(result.content[0].text).toContain('MOCK123');
      expect(result.content[0].text).toContain('held');
    });

    it('should handle booking with payment required status', async () => {
      const mockBookingResponse = {
        id: 'ord_mock_123',
        booking_reference: 'MOCK123',
        live_mode: false,
        documents: []
      };
      mockDuffelClient.holdFlight.mockResolvedValue(mockBookingResponse);

      const result = await flightTools.bookFlight({
        offer_id: 'off_mock_123',
        passenger: mockPassenger
      });

      expect(result.content[0].text).toContain('"success": true');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle expired offer', async () => {
      mockDuffelClient.holdFlight.mockRejectedValue(new Error('Offer has expired'));

      const result = await flightTools.bookFlight({
        offer_id: 'off_expired_123',
        passenger: mockPassenger
      });

      expect(result.content[0].text).toContain('"success": false');
      expect(result.content[0].text).toContain('expired');
    });

    it('should handle sold out flights', async () => {
      mockDuffelClient.holdFlight.mockRejectedValue(new Error('No seats available'));

      const result = await flightTools.bookFlight({
        offer_id: 'off_soldout_123',
        passenger: mockPassenger
      });

      expect(result.content[0].text).toContain('"success": false');
      expect(result.content[0].text).toContain('No seats available');
    });

    it('should handle invalid passenger data', async () => {
      mockDuffelClient.holdFlight.mockRejectedValue(new Error('Invalid passenger information'));

      const invalidPassenger = {
        ...mockPassenger,
        email: 'invalid-email'
      };

      const result = await flightTools.bookFlight({
        offer_id: 'off_mock_123',
        passenger: invalidPassenger
      });

      expect(result.content[0].text).toContain('"success": false');
    });

    it('should handle payment processing errors', async () => {
      mockDuffelClient.holdFlight.mockRejectedValue(new Error('Payment processing failed'));

      const result = await flightTools.bookFlight({
        offer_id: 'off_mock_123',
        passenger: mockPassenger
      });

      expect(result.content[0].text).toContain('"success": false');
      expect(result.content[0].text).toContain('Payment processing failed');
    });

    it('should handle network timeouts', async () => {
      mockDuffelClient.holdFlight.mockRejectedValue(new Error('Request timeout'));

      const result = await flightTools.bookFlight({
        offer_id: 'off_mock_123',
        passenger: mockPassenger
      });

      expect(result.content[0].text).toContain('"success": false');
      expect(result.content[0].text).toContain('timeout');
    });

    it('should handle API rate limiting', async () => {
      mockDuffelClient.holdFlight.mockRejectedValue(new Error('Rate limit exceeded'));

      const result = await flightTools.bookFlight({
        offer_id: 'off_mock_123',
        passenger: mockPassenger
      });

      expect(result.content[0].text).toContain('"success": false');
      expect(result.content[0].text).toContain('Rate limit exceeded');
    });
  });

  describe('Booking Confirmation Scenarios', () => {
    it('should handle immediate confirmation', async () => {
      const mockBookingResponse = {
        id: 'ord_mock_123',
        booking_reference: 'MOCK123',
        documents: [
          {
            type: 'eticket',
            url: 'https://example.com/ticket.pdf'
          }
        ],
        conditions: {
          change_before_departure: null,
          refund_before_departure: null
        }
      };
      mockDuffelClient.holdFlight.mockResolvedValue(mockBookingResponse);

      const result = await flightTools.bookFlight({
        offer_id: 'off_mock_123',
        passenger: mockPassenger
      });

      expect(result.content[0].text).toContain('MOCK123');
      expect(result.content[0].text).toContain('held');
    });

    it('should handle pending confirmation', async () => {
      const mockBookingResponse = {
        id: 'ord_mock_123',
        booking_reference: 'PENDING123',
        documents: [],
        live_mode: false
      };
      mockDuffelClient.holdFlight.mockResolvedValue(mockBookingResponse);

      const result = await flightTools.bookFlight({
        offer_id: 'off_mock_123',
        passenger: mockPassenger
      });

      expect(result.content[0].text).toContain('PENDING123');
    });
  });

  describe('Instant Booking with Payment', () => {
    it('should complete instant booking successfully', async () => {
      const mockInstantBookingResponse = {
        id: 'ord_instant_123',
        booking_reference: 'INSTANT123',
        total_amount: '299.00',
        total_currency: 'USD',
        documents: [
          {
            type: 'eticket',
            url: 'https://example.com/eticket.pdf'
          }
        ],
        passengers: [mockPassenger],
        slices: [mockFlightOffer.slices[0]]
      };
      mockDuffelClient.bookFlightInstant.mockResolvedValue(mockInstantBookingResponse);

      const result = await flightTools.bookFlight({
        offer_id: 'off_instant_123',
        passenger: mockPassenger,
        booking_type: 'instant',
        payment: {
          amount: '299.00',
          currency: 'USD',
          payment_type: 'balance'
        }
      });

      expect(mockDuffelClient.bookFlightInstant).toHaveBeenCalledWith(
        'off_instant_123',
        mockPassenger,
        {
          amount: '299.00',
          currency: 'USD',
          payment_type: 'balance'
        }
      );

      expect(result.content[0].text).toContain('\"success\": true');
      expect(result.content[0].text).toContain('\"status\": \"confirmed\"');
      expect(result.content[0].text).toContain('INSTANT123');
      expect(result.content[0].text).toContain('eticket');
    });

    it('should handle instant booking with international passengers', async () => {
      const internationalPassenger = {
        ...mockPassenger,
        given_name: 'José',
        family_name: 'García',
        email: 'jose.garcia@example.com',
        phone_number: '+34612345678'
      };

      const mockInstantBookingResponse = {
        id: 'ord_intl_123',
        booking_reference: 'INTL123',
        total_amount: '599.00',
        total_currency: 'EUR',
        documents: [
          {
            type: 'eticket',
            url: 'https://example.com/intl-eticket.pdf'
          }
        ],
        passengers: [internationalPassenger],
        slices: [mockFlightOffer.slices[0]]
      };
      mockDuffelClient.bookFlightInstant.mockResolvedValue(mockInstantBookingResponse);

      const result = await flightTools.bookFlight({
        offer_id: 'off_intl_123',
        passenger: internationalPassenger,
        booking_type: 'instant',
        payment: {
          amount: '599.00',
          currency: 'EUR',
          payment_type: 'balance'
        }
      });

      expect(result.content[0].text).toContain('\"success\": true');
      expect(result.content[0].text).toContain('\"status\": \"confirmed\"');
      expect(result.content[0].text).toContain('INTL123');
      expect(result.content[0].text).toContain('EUR');
    });

    it('should handle instant booking payment failure', async () => {
      mockDuffelClient.bookFlightInstant.mockRejectedValue(
        new Error('Payment failed: Insufficient funds')
      );

      const result = await flightTools.bookFlight({
        offer_id: 'off_payment_fail_123',
        passenger: mockPassenger,
        booking_type: 'instant',
        payment: {
          amount: '299.00',
          currency: 'USD',
          payment_type: 'balance'
        }
      });

      expect(result.content[0].text).toContain('\"success\": false');
      expect(result.content[0].text).toContain('Payment failed');
    });
  });
});