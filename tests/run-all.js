/**
 * Master Test Runner
 * Executes all automated test suites.
 */

async function runAll() {
  console.log('====================================================');
  console.log('STARTING CHATBOT CREATOR TEST SUITE');
  console.log('====================================================\n');

  try {
    await import('./config-tests.js');
    await import('./chatbot-engine-tests.js');
    await import('./workflow-tests.js');
    await import('./integration-tests.js');

    console.log('====================================================');
    console.log('ALL TEST SUITES PASSED SUCCESSFULLY (100% PASS)');
    console.log('====================================================');
  } catch (err) {
    console.error('TEST FAILURE DETECTED:');
    console.error(err);
    process.exit(1);
  }
}

runAll();
