/**
 * Script om foto-URL's te testen
 */

async function testUrl(url, name) {
  try {
    console.log(`Testing ${name}: ${url}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.procyclingstats.com/'
      }
    });
    
    const contentType = response.headers.get('content-type');
    const status = response.status;
    
    console.log(`  Status: ${status}, Content-Type: ${contentType}`);
    
    if (response.ok && contentType && contentType.startsWith('image/')) {
      console.log(`  ✅ Works!`);
      return true;
    } else {
      console.log(`  ❌ Failed`);
      return false;
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    return false;
  }
}

async function testUrls() {
  const urls = [
    { url: 'https://www.procyclingstats.com/images/riders/bp/cb/davide-ballerini-2025.jpeg', name: 'Davide Ballerini' },
    { url: 'https://www.procyclingstats.com/images/riders/bp/cb/tadej-pogacar-2025.jpeg', name: 'Tadej Pogacar' },
    { url: 'https://www.procyclingstats.com/images/riders/bp/cb/mathieu-van-der-poel-2025.jpeg', name: 'Mathieu van der Poel' },
    { url: 'https://www.procyclingstats.com/images/riders/bp/cb/jonas-vingegaard-2025.jpeg', name: 'Jonas Vingegaard' },
  ];
  
  for (const { url, name } of urls) {
    await testUrl(url, name);
    console.log('');
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

testUrls();

