/**
 * Script om te testen of foto-URL's daadwerkelijk bestaan
 */

const urls = [
  'https://www.procyclingstats.com/images/riders/bp/cb/davide-ballerini-2025.jpeg',
  'https://www.procyclingstats.com/images/riders/bp/cb/tadej-pogacar-2025.jpeg',
  'https://www.procyclingstats.com/images/riders/bp/cb/jonas-vingegaard-2025.jpeg',
  'https://www.procyclingstats.com/images/riders/bp/cb/mathieu-van-der-poel-2025.jpeg',
  'https://www.procyclingstats.com/images/riders/bp/cb/remco-evenepoel-2025.jpeg',
];

async function testUrls() {
  console.log('Testen van foto-URL\'s...\n');
  
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.procyclingstats.com/'
        }
      });
      
      const status = response.status;
      const contentType = response.headers.get('content-type');
      const size = response.headers.get('content-length');
      
      if (response.ok) {
        console.log(`✅ ${url}`);
        console.log(`   Status: ${status}, Type: ${contentType}, Size: ${size || 'unknown'} bytes\n`);
      } else {
        console.log(`❌ ${url}`);
        console.log(`   Status: ${status} ${response.statusText}\n`);
      }
    } catch (error) {
      console.log(`❌ ${url}`);
      console.log(`   Error: ${error.message}\n`);
    }
  }
}

testUrls().catch(console.error);
