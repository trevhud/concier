import { Resource } from '@modelcontextprotocol/sdk/types.js';

export const TRAVEL_RESOURCES: Resource[] = [
  {
    uri: 'travel://airports',
    name: 'Airport Information',
    description: 'Common airport codes and information for flight searches',
    mimeType: 'application/json',
  },
  {
    uri: 'travel://airlines',
    name: 'Airline Information', 
    description: 'Major airline codes and information',
    mimeType: 'application/json',
  },
  {
    uri: 'travel://cabin-classes',
    name: 'Flight Cabin Classes',
    description: 'Available cabin classes for flight booking',
    mimeType: 'application/json',
  },
  {
    uri: 'travel://hotel-amenities',
    name: 'Hotel Amenities',
    description: 'Common hotel amenities and features',
    mimeType: 'application/json',
  },
];

export const AIRPORT_DATA = {
  major_airports: [
    { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'USA' },
    { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'USA' },
    { code: 'LHR', name: 'London Heathrow Airport', city: 'London', country: 'UK' },
    { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France' },
    { code: 'NRT', name: 'Narita International Airport', city: 'Tokyo', country: 'Japan' },
    { code: 'SYD', name: 'Sydney Kingsford Smith Airport', city: 'Sydney', country: 'Australia' },
    { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'UAE' },
    { code: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore' },
  ],
  search_tips: [
    'Use 3-letter IATA codes for accurate searches',
    'Check multiple nearby airports for better deals',
    'Consider alternative airports in major cities',
  ],
};

export const AIRLINE_DATA = {
  major_carriers: [
    { code: 'AA', name: 'American Airlines', alliance: 'OneWorld' },
    { code: 'DL', name: 'Delta Air Lines', alliance: 'SkyTeam' },
    { code: 'UA', name: 'United Airlines', alliance: 'Star Alliance' },
    { code: 'BA', name: 'British Airways', alliance: 'OneWorld' },
    { code: 'LH', name: 'Lufthansa', alliance: 'Star Alliance' },
    { code: 'AF', name: 'Air France', alliance: 'SkyTeam' },
    { code: 'EK', name: 'Emirates', alliance: 'None' },
    { code: 'SQ', name: 'Singapore Airlines', alliance: 'Star Alliance' },
  ],
  alliances: {
    'OneWorld': ['AA', 'BA', 'QF', 'JL', 'CX'],
    'Star Alliance': ['UA', 'LH', 'AC', 'SQ', 'TG'],
    'SkyTeam': ['DL', 'AF', 'KL', 'KE', 'VS'],
  },
};

export const CABIN_CLASS_DATA = {
  classes: [
    {
      name: 'economy',
      description: 'Standard seating with basic amenities',
      features: ['Standard seat', 'Basic meal service', 'Limited legroom'],
    },
    {
      name: 'business',
      description: 'Enhanced comfort with premium amenities',
      features: ['Lie-flat seats', 'Premium dining', 'Priority boarding', 'Lounge access'],
    },
    {
      name: 'first',
      description: 'Luxury travel experience',
      features: ['Private suites', 'Gourmet dining', 'Dedicated service', 'Premium lounges'],
    },
  ],
  upgrade_tips: [
    'Book early for better upgrade availability',
    'Join airline loyalty programs',
    'Consider paid upgrades at check-in',
  ],
};

export const HOTEL_AMENITIES_DATA = {
  common_amenities: [
    'Free WiFi',
    'Pool',
    'Fitness Center',
    'Restaurant',
    'Room Service',
    'Concierge',
    'Parking',
    'Business Center',
    'Spa',
    'Bar/Lounge',
  ],
  room_types: [
    'Standard Room',
    'Deluxe Room', 
    'Suite',
    'Executive Room',
    'Family Room',
    'Connecting Rooms',
  ],
  bed_types: [
    'Single Bed',
    'Double Bed',
    'Queen Bed',
    'King Bed',
    'Twin Beds',
  ],
  policies: {
    check_in: 'Usually 3:00 PM or later',
    check_out: 'Usually 11:00 AM or earlier',
    cancellation: 'Varies by rate and property',
    pets: 'Check individual hotel policies',
  },
};