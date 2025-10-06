import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testCORS() {
  const VERCEL_ORIGIN = 'https://djamms-prototype.vercel.app';
  const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://syd.cloud.appwrite.io/v1';
  
  try {
    // Use curl to simulate browser CORS preflight
    const { stdout } = await execAsync(
      `curl -H "Origin: ${VERCEL_ORIGIN}" -H "Access-Control-Request-Method: GET" -X OPTIONS -v "${APPWRITE_ENDPOINT}/account" 2>&1`
    );
    
    if (stdout.includes(`access-control-allow-origin: ${VERCEL_ORIGIN}`)) {
      console.log('✅ CORS configured correctly for Vercel origin');
      return true;
    } else if (stdout.includes('access-control-allow-origin: *')) {
      console.log('⚠️ CORS allows all origins (wildcard) - consider restricting for production');
      return true;
    } else {
      console.log('❌ CORS not configured for Vercel origin');
      console.log('Response headers:', stdout.match(/access-control-allow-origin:.*/gi));
      return false;
    }
  } catch (error) {
    console.error('Error testing CORS:', error);
    return false;
  }
}

testCORS();

testCORS();