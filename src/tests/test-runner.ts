#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Concier Travel MCP Server
 *
 * This script runs all test suites and provides detailed reporting
 * on coverage and test results for flight booking functionality.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface TestSuite {
  name: string;
  path: string;
  description: string;
}

const testSuites: TestSuite[] = [
  {
    name: 'Flight Search Tests',
    path: 'src/tests/flights/search.test.ts',
    description:
      'Tests all flight search permutations: one-way, round-trip, cabin classes, passenger counts',
  },
  {
    name: 'Flight Booking Tests',
    path: 'src/tests/flights/booking.test.ts',
    description:
      'Tests comprehensive booking scenarios: passenger variations, contact info, error handling',
  },
  {
    name: 'Flight Details Tests',
    path: 'src/tests/flights/details.test.ts',
    description:
      'Tests flight offer detail retrieval: complex routes, aircraft types, pricing',
  },
  {
    name: 'Complete Booking Flow Tests',
    path: 'src/tests/flights/complete-booking.test.ts',
    description:
      'Tests end-to-end booking: instant orders, payment processing, confirmed bookings',
  },
  {
    name: 'Order Management Tests',
    path: 'src/tests/flights/order-management.test.ts',
    description:
      'Tests order operations: payment processing, cancellations, refunds',
  },
  {
    name: 'MCP Protocol Tests',
    path: 'src/tests/integration/mcp-protocol.test.ts',
    description: 'Tests MCP protocol compliance and integration',
  },
  {
    name: 'End-to-End Payment Flow Tests',
    path: 'src/tests/end-to-end/complete-payment-flow.test.ts',
    description: 'Tests complete flow: WebSocket → ReAct → DuffelCardForm → payment processing',
  },
];

async function runTestSuite(suite: TestSuite): Promise<boolean> {
  console.log(`\n🧪 Running ${suite.name}...`);
  console.log(`📝 ${suite.description}`);

  try {
    const { stdout, stderr } = await execAsync(
      `npx vitest run ${suite.path} --reporter=verbose`
    );

    if (stdout) {
      console.log(stdout);
    }

    if (stderr && !stderr.includes('Warning')) {
      console.error('❌ Test errors:', stderr);
      return false;
    }

    console.log(`✅ ${suite.name} completed successfully`);
    return true;
  } catch (error) {
    console.error(`❌ ${suite.name} failed:`, error);
    return false;
  }
}

async function runAllTests(): Promise<void> {
  console.log('🚀 Starting Comprehensive Flight Booking Tests');
  console.log('='.repeat(60));

  const results: boolean[] = [];

  for (const suite of testSuites) {
    const result = await runTestSuite(suite);
    results.push(result);
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;

  testSuites.forEach((suite, index) => {
    const status = results[index] ? '✅ PASSED' : '❌ FAILED';
    console.log(`${status} - ${suite.name}`);

    if (results[index]) {
      passed++;
    } else {
      failed++;
    }
  });

  console.log(`\nTotal: ${testSuites.length} test suites`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed === 0) {
    console.log(
      '\n🎉 All tests passed! Your MCP server is ready for production.'
    );
  } else {
    console.log('\n⚠️  Some tests failed. Please review the output above.');
    process.exit(1);
  }
}

async function runCoverage(): Promise<void> {
  console.log('\n📈 Generating Coverage Report...');

  try {
    const { stdout } = await execAsync('npx vitest run --coverage');
    console.log(stdout);
  } catch (error) {
    console.error('Coverage generation failed:', error);
  }
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'all':
    runAllTests();
    break;
  case 'coverage':
    runCoverage();
    break;
  case 'flights':
    Promise.all([
      runTestSuite(testSuites[0]),
      runTestSuite(testSuites[1]),
      runTestSuite(testSuites[2]),
      runTestSuite(testSuites[3]),
      runTestSuite(testSuites[4]),
    ]);
    break;
  case 'integration':
    runTestSuite(testSuites[5]);
    break;
  case 'e2e':
  case 'end-to-end':
    runTestSuite(testSuites[6]);
    break;
  default:
    console.log(`
🧪 Concier Travel MCP Test Runner

Usage: npm run test:[command]

Commands:
  all         - Run all test suites
  flights     - Run flight-related tests only  
  integration - Run MCP protocol integration tests
  e2e         - Run end-to-end payment flow tests
  coverage    - Generate coverage report

Test Suites Available:
${testSuites.map((suite) => `  • ${suite.name}: ${suite.description}`).join('\n')}

Examples:
  npm run test:all
  npm run test:flights
  npm run test:e2e
  npm run test:coverage
`);
    break;
}

export { runAllTests, runTestSuite, testSuites };
