// @ts-ignore
const fetch = global.fetch;

const APPWRITE_ENDPOINT = 'https://syd.cloud.appwrite.io/v1';
const VERCEL_ORIGIN = 'https://djamms-prototype.vercel.app';

async function testCORS() {
  console.log('Testing CORS configuration for Appwrite endpoint...');
  console.log(`Endpoint: ${APPWRITE_ENDPOINT}`);
  console.log(`Origin: ${VERCEL_ORIGIN}`);

  try {
    const response = await fetch(`${APPWRITE_ENDPOINT}/account`, {
      method: 'GET',
      headers: {
        'Origin': VERCEL_ORIGIN,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'content-type',
      },
    });

    console.log(`Status: ${response.status}`);
    console.log(`Status Text: ${response.statusText}`);

    const corsHeaders = {
      'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
      'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
      'access-control-allow-headers': response.headers.get('access-control-allow-headers'),
      'access-control-allow-credentials': response.headers.get('access-control-allow-credentials'),
    };

    console.log('CORS Headers:');
    Object.entries(corsHeaders).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });

    if (corsHeaders['access-control-allow-origin'] === VERCEL_ORIGIN ||
        corsHeaders['access-control-allow-origin'] === '*') {
      console.log('✅ CORS configured correctly for Vercel origin');
    } else {
      console.log('❌ CORS not configured for Vercel origin');
      console.log(`Expected: ${VERCEL_ORIGIN} or *`);
      console.log(`Received: ${corsHeaders['access-control-allow-origin']}`);
    }

  } catch (error) {
    console.error('Error testing CORS:', error);
  }
}

testCORS();