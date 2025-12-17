/**
 * Script om alternatieve URL-structuren te testen
 */

const testCases = [
  // Current pattern
  { name: 'Tadej Pogacar', urls: [
    'https://www.procyclingstats.com/images/riders/bp/cb/tadej-pogacar-2025.jpeg',
    'https://www.procyclingstats.com/images/riders/bp/cb/tadej-pogacar.jpeg',
    'https://www.procyclingstats.com/images/riders/bp/dc/tadej-pogacar-2025.jpg',
    'https://www.procyclingstats.com/images/riders/bp/dc/tadej-pogacar.jpg',
    'https://www.procyclingstats.com/images/riders/bp/cb/tadej-pogacar-2024.jpeg',
  ]},
  { name: 'Jonas Vingegaard', urls: [
    'https://www.procyclingstats.com/images/riders/bp/cb/jonas-vingegaard-2025.jpeg',
    'https://www.procyclingstats.com/images/riders/bp/cb/jonas-vingegaard.jpeg',
    'https://www.procyclingstats.com/images/riders/bp/dc/jonas-vingegaard-2025.jpg',
  ]},
  { name: 'Mathieu Van Der Poel', urls: [
    'https://www.procyclingstats.com/images/riders/bp/cb/mathieu-van-der-poel-2025.jpeg',
    'https://www.procyclingstats.com/images/riders/bp/cb/mathieu-van-der-poel.jpeg',
    'https://www.procyclingstats.com/images/riders/bp/cb/mathieu-vanderpoel-2025.jpeg',
  ]},
];

async function testUrl(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.procyclingstats.com/'
      }
    });
    
    const contentType = response.headers.get('content-type');
    return {
      status: response.status,
      contentType,
      isImage: contentType && contentType.startsWith('image/')
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function testAll() {
  for (const testCase of testCases) {
    console.log(`\n${testCase.name}:`);
    console.log('─'.repeat(60));
    
    for (const url of testCase.urls) {
      const result = await testUrl(url);
      if (result.isImage) {
        console.log(`✅ ${url}`);
        console.log(`   Status: ${result.status}, Type: ${result.contentType}`);
      } else if (result.error) {
        console.log(`❌ ${url}`);
        console.log(`   Error: ${result.error}`);
      } else {
        console.log(`⚠️  ${url}`);
        console.log(`   Status: ${result.status}, Type: ${result.contentType || 'unknown'}`);
      }
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

testAll().catch(console.error);
