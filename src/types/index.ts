export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface Location {
  radius: number;
  geographic_coordinates: GeoCoordinates;
}

export interface SearchParams {
  location: Location;
  check_in_date: string;
  check_out_date: string;
  adults: number;
  rooms: number;
  loyalty_program_account?: string;
}

export interface BedConfiguration {
  type: 'single' | 'double' | 'queen' | 'king';
  count: number;
}

export interface CancellationPolicy {
  deadline: string;
  amount: number;
  currency: string;
}

export interface RateResponse {
  room_type: string;
  bed_configurations: BedConfiguration[];
  amenities: string[];
  cancellation_policy: CancellationPolicy;
  total_amount: number;
  currency: string;
}

export interface BookingResponse {
  id: string;
  confirmation_number: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  check_in_date: string;
  check_out_date: string;
  total_amount: number;
  currency: string;
}

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string;
  cabin_class?: string;
  adults: number;
}

export interface FlightOffer {
  id: string;
  airline: string;
  flights: {
    outbound: {
      departing_at: string;
      arriving_at: string;
    };
    return?: {
      departing_at: string;
      arriving_at: string;
    };
  };
  total_amount: string;
  total_currency: string;
}

export interface FlightSearchResponse {
  partial_offer_request_id: string;
  offers: FlightOffer[];
}

export interface PassengerInfo {
  phone_number: string;
  email: string;
  title: string;
  gender: string;
  family_name: string;
  given_name: string;
  born_on: string;
}

export interface PaymentInfo {
  amount: string;
  currency: string;
  payment_type: string;
  card_number?: string;
  expiry_month?: string;
  expiry_year?: string;
  cvc?: string;
}

export type RequestType = 'flight' | 'hotel';

export interface RouteRequest {
  query: string;
  type?: RequestType;
}
