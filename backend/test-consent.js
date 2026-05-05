// Test script to verify consent endpoint is working

const testConsentEndpoint = async () => {
  try {
    console.log('🧪 Testing consent endpoint...\n');

    // Test 1: POST /log endpoint
    console.log('📝 Test 1: Logging consent...');
    const logResponse = await fetch('http://localhost:5000/api/consent/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        visitor_id: 'test_visitor_' + Date.now(),
        consent_type: 'all_cookies',
        consent_value: true,
        page_url: '/test',
        session_id: null,
        user_id: null
      })
    });

    const logData = await logResponse.json();
    console.log('Response:', logData);
    console.log(`Status: ${logResponse.status}\n`);

    // Test 2: Test endpoint
    console.log('✅ Test 2: Testing /test endpoint...');
    const testResponse = await fetch('http://localhost:5000/api/consent/test');
    const testData = await testResponse.json();
    console.log('Response:', testData);
    console.log(`Status: ${testResponse.status}\n`);

    // Test 3: Get stats
    console.log('📊 Test 3: Getting consent stats...');
    const statsResponse = await fetch('http://localhost:5000/api/consent/stats');
    const statsData = await statsResponse.json();
    console.log('Response:', statsData);
    console.log(`Status: ${statsResponse.status}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

testConsentEndpoint();
