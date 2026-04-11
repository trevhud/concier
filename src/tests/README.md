# Concier Travel MCP Server - Test Suite

Comprehensive testing suite for the Concier Travel MCP server, covering all flight booking permutations and edge cases.

## Test Coverage

### Flight Search Tests (`flights/search.test.ts`)
Tests all possible flight search scenarios:

#### Trip Types
- ✅ **One-way flights** - Domestic and international
- ✅ **Round-trip flights** - With return dates
- ✅ **Multi-segment flights** - Connections and layovers

#### Cabin Classes
- ✅ Economy class
- ✅ Business class  
- ✅ First class

#### Passenger Variations
- ✅ Single adult (1 passenger)
- ✅ Couple (2 passengers)
- ✅ Family of four (4 passengers) 
- ✅ Large group (6 passengers)
- ✅ Maximum passengers (9 passengers)

#### Route Coverage
- ✅ Popular domestic routes (LAX-JFK, SFO-LAX)
- ✅ Transatlantic routes (JFK-LHR, MIA-CDG)
- ✅ Transpacific routes (LAX-NRT, SEA-AMS)
- ✅ European routes (DFW-FRA, ORD-FCO)

#### Date Variations
- ✅ Near-future dates (tomorrow)
- ✅ Far-future dates (1 year ahead)
- ✅ Peak season travel
- ✅ Off-season travel

### Flight Booking Tests (`flights/booking.test.ts`)
Tests comprehensive booking scenarios:

#### Passenger Information
- ✅ **Titles**: Mr, Ms, Mrs, Dr
- ✅ **Genders**: Male, Female
- ✅ **Age groups**: Young adult (18), Adult (34), Middle-aged (54), Senior (74), Elderly (84)

#### International Name Support
- ✅ Spanish names with accents (José García)
- ✅ French/German names (François Müller)
- ✅ Cyrillic names (Александр Петров)
- ✅ Japanese names (田中 太郎)
- ✅ Arabic names (محمد أحمد)
- ✅ Names with apostrophes (O'Connor, D'Angelo)
- ✅ Names with particles (van der Berg, de la Cruz)

#### Contact Information Formats
- ✅ US format (+1234567890, user@gmail.com)
- ✅ UK format (+44207123456, test.user+tag@domain.co.uk)
- ✅ German format (+49301234567)
- ✅ Japanese format (+81312345678)
- ✅ Australian format (+61298765432)

#### Booking Methods
- ✅ **Hold for later payment** - Traditional booking flow
- ✅ **Instant booking with payment** - Immediate confirmation
- ✅ **International passenger booking** - Multi-currency support

#### Error Handling
- ✅ Expired offers
- ✅ Sold out flights
- ✅ Invalid passenger data
- ✅ Payment processing errors
- ✅ Network timeouts
- ✅ API rate limiting

### Flight Details Tests (`flights/details.test.ts`)
Tests flight offer detail retrieval:

#### Offer Variations
- ✅ Simple one-way offers
- ✅ Round-trip offers
- ✅ Multi-segment offers with connections
- ✅ Different aircraft types (Boeing 737, Airbus A320, etc.)
- ✅ Price ranges ($99 - $5999)
- ✅ Multiple currencies (USD, EUR, GBP, JPY, CAD, AUD)
- ✅ Flight durations (1h30m - 15h45m)

#### Airline Coverage
- ✅ Major US carriers (American, Delta, United, Southwest, JetBlue)
- ✅ International carriers (Lufthansa, British Airways, Air France)
- ✅ Codeshare flights
- ✅ Operating vs marketing carriers

#### Complex Scenarios
- ✅ Red-eye flights (overnight)
- ✅ Long layovers (8+ hours)
- ✅ Same-day connections
- ✅ International connections

### Complete Booking Flow Tests (`flights/complete-booking.test.ts`)
Tests end-to-end booking scenarios with confirmed orders:

#### Instant Payment Processing
- ✅ **Successful payments** - GB, US, Irish, Australian test cards
- ✅ **3D Secure authentication** - Multi-step verification
- ✅ **Payment failures** - Insufficient funds, declined cards
- ✅ **Multiple currencies** - USD, EUR, GBP payment processing
- ✅ **E-ticket generation** - Document confirmation

#### Hold and Pay Later Flow
- ✅ **Two-step booking** - Hold first, pay later
- ✅ **Payment processing** - For previously held orders
- ✅ **Payment failures** - Expired cards, processing errors
- ✅ **Order state transitions** - Held → Paid → Confirmed

#### Complete Booking Scenarios
- ✅ **Business class bookings** - Premium cabin confirmations
- ✅ **International bookings** - Multi-currency processing
- ✅ **Round-trip confirmations** - Complex itinerary handling
- ✅ **Network error recovery** - Timeout and retry handling

### Order Management Tests (`flights/order-management.test.ts`)
Tests post-booking order operations:

#### Payment Processing
- ✅ **Successful payments** - Multiple currencies (USD, EUR, GBP, JPY, CAD)
- ✅ **Payment failures** - Card declined, expired, network errors
- ✅ **Order validation** - Invalid order IDs, expired orders
- ✅ **Amount validation** - Price ranges $99 - $2999

#### Order Cancellation
- ✅ **Full refunds** - Confirmed orders within cancellation window
- ✅ **Partial refunds** - Orders with cancellation fees
- ✅ **No refunds** - Held orders (no payment processed)
- ✅ **Cancellation failures** - Outside window, already departed

#### Order State Management
- ✅ **State transitions** - Held → Paid → Cancelled
- ✅ **Refund processing** - Variable refund amounts
- ✅ **Error recovery** - Network timeouts, API rate limiting
- ✅ **Currency handling** - Refunds in original currency

### MCP Protocol Tests (`integration/mcp-protocol.test.ts`)
Tests MCP server compliance:

#### Protocol Compliance
- ✅ JSON-RPC 2.0 format
- ✅ Initialize request/response
- ✅ Tool registration
- ✅ Error handling

#### Tool Validation
- ✅ Schema validation for all tools
- ✅ Required parameter validation
- ✅ Optional parameter handling
- ✅ Unknown tool error handling

## Running Tests

### Quick Start
```bash
# Run all tests
npm run test:all

# Run only flight-related tests
npm run test:flights

# Run MCP integration tests
npm run test:integration

# Generate coverage report
npm run test:coverage

# Interactive test UI
npm run test:ui
```

### Individual Test Suites
```bash
# Flight search tests only
npx vitest src/tests/flights/search.test.ts

# Flight booking tests only  
npx vitest src/tests/flights/booking.test.ts

# Flight details tests only
npx vitest src/tests/flights/details.test.ts

# MCP protocol tests only
npx vitest src/tests/integration/mcp-protocol.test.ts
```

### Watch Mode
```bash
# Watch all tests
npm run test:watch

# Watch specific test file
npx vitest src/tests/flights/search.test.ts --watch
```

## Test Configuration

### Environment Setup
Tests use mocked API responses to ensure consistent, fast execution without external dependencies.

Required environment variables for testing:
```bash
DUFFEL_ACCESS_TOKEN=duffel_test_mock_token
AMADEUS_CLIENT_ID=mock_client_id  
AMADEUS_CLIENT_SECRET=mock_client_secret
```

### Mock Data
- **Flight offers**: Realistic mock responses from Duffel API
- **Passenger data**: Comprehensive test passenger profiles
- **Hotel data**: Mock hotel properties and rates
- **Error scenarios**: Simulated API error conditions

## Coverage Goals

- **Line Coverage**: >95%
- **Function Coverage**: 100%
- **Branch Coverage**: >90%
- **Statement Coverage**: >95%

## Test Statistics

### Current Test Coverage: **121 tests** across 5 test suites

- **Flight Search**: 25 tests
- **Flight Booking**: 40 tests (including instant booking)
- **Flight Details**: 23 tests
- **Complete Booking Flow**: 15 tests
- **Order Management**: 18 tests

## Test Categories

### Unit Tests
- Individual tool functions
- Data validation
- Error handling logic

### Integration Tests  
- MCP protocol compliance
- End-to-end tool execution
- API client integration

### Edge Case Tests
- Boundary conditions
- Invalid inputs
- Network failures
- API rate limits

## Contributing

When adding new features, ensure:

1. **Add corresponding tests** for new functionality
2. **Update mock data** if new API responses are needed  
3. **Test edge cases** and error conditions
4. **Maintain coverage** above the target thresholds
5. **Document test scenarios** in this README

## Test Data Sources

### Flight Routes
Based on real-world popular routes:
- Domestic US routes with high traffic
- Major international gateway pairs
- Business travel corridors
- Vacation destinations

### Passenger Profiles
Covers diverse demographics:
- Various age groups and life stages
- International name formats
- Different contact preferences
- Accessibility considerations

### Booking Scenarios
Real-world booking patterns:
- Solo business travelers
- Family vacations
- Group bookings
- Last-minute travel
- Advance bookings