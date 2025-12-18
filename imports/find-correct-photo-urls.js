/**
 * Script om de juiste foto-URL patterns te vinden
 */

async function testUrl(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.procyclingstats.com/'
      }
    });
    
    const contentType = response.headers.get('content-type');
    
    if (response.ok && contentType && contentType.startsWith('image/')) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function findCorrectUrl(firstName, lastName) {
  const first = firstName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const last = lastName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  
  const patterns = [
    `https://www.procyclingstats.com/images/riders/bp/cb/${first}-${last}-2025.jpeg`,
    `https://www.procyclingstats.com/images/riders/bp/dc/${first}-${last}-2025.jpg`,
    `https://www.procyclingstats.com/images/riders/bp/cb/${first}-${last}-2025.jpg`,
    `https://www.procyclingstats.com/images/riders/bp/dc/${first}-${last}-2025.jpeg`,
    `https://www.procyclingstats.com/images/riders/bp/cb/${first}-${last}.jpeg`,
    `https://www.procyclingstats.com/images/riders/bp/dc/${first}-${last}.jpg`,
  ];
  
  for (const url of patterns) {
    if (await testUrl(url)) {
      return url;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return null;
}

async function testRiders() {
  const riders = [
    { first: 'Tadej', last: 'Pogacar' },
    { first: 'Mathieu', last: 'van der Poel' },
    { first: 'Jonas', last: 'Vingegaard' },
    { first: 'Remco', last: 'Evenepoel' },
  ];
  
  for (const rider of riders) {
    console.log(`Testing ${rider.first} ${rider.last}...`);
    const url = await findCorrectUrl(rider.first, rider.last);
    if (url) {
      console.log(`  ✅ Found: ${url}`);
    } else {
      console.log(`  ❌ Not found`);
    }
    console.log('');
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

testRiders();



