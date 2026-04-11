declare module 'amadeus' {
  export interface AmadeusConfig {
    clientId: string;
    clientSecret: string;
    hostname?: string;
    logLevel?: string;
  }

  export interface AmadeusResponse<T = any> {
    data: T;
    result: T;
    meta?: any;
  }

  export interface FlightSearchParams {
    originLocationCode: string;
    destinationLocationCode: string;
    departureDate: string;
    adults: number;
    returnDate?: string;
    max?: number;
  }

  export interface FlightDestinationParams {
    origin: string;
  }

  export interface FlightDatesParams {
    origin: string;
    destination: string;
  }

  export interface FlightStatusParams {
    carrierCode: string;
    flightNumber: string;
    scheduledDepartureDate: string;
  }

  export interface CheckinLinksParams {
    airlineCode: string;
  }

  export class Client {
    constructor(config: AmadeusConfig);

    shopping: {
      flightOffersSearch: {
        get(params: FlightSearchParams): Promise<AmadeusResponse>;
      };
      flightDestinations: {
        get(params: FlightDestinationParams): Promise<AmadeusResponse>;
      };
      flightDates: {
        get(params: FlightDatesParams): Promise<AmadeusResponse>;
      };
      flightOffers: {
        pricing: {
          post(data: string): Promise<AmadeusResponse>;
        };
        prediction: {
          post(data: string): Promise<AmadeusResponse>;
        };
      };
    };

    booking: {
      flightOrders: {
        post(data: string): Promise<AmadeusResponse>;
      };
      flightOrder(id: string): {
        get(): Promise<AmadeusResponse>;
      };
    };

    schedule: {
      flights: {
        get(params: FlightStatusParams): Promise<AmadeusResponse>;
      };
    };

    referenceData: {
      urls: {
        checkinLinks: {
          get(params: CheckinLinksParams): Promise<AmadeusResponse>;
        };
      };
    };
  }

  export default Client;
}
