#!/usr/bin/env node
/**
 * Build optimization script for Netlify deployment
 * 
 * This script can be extended to:
 * - Minify CSS
 * - Minify JavaScript
 * - Optimize images
 * - Generate service worker
 * - Bundle assets
 * 
 * Currently, Netlify handles most optimizations automatically,
 * but this script can be used for custom optimizations.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');

/**
 * Get file size in bytes
 */
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Analyze project assets
 */
function analyzeAssets() {
  console.log('📊 Analyzing project assets...\n');

  const assets = {
    html: [],
    css: [],
    js: [],
    images: []
  };

  // Find HTML files
  const htmlFiles = fs.readdirSync(ROOT_DIR)
    .filter(file => file.endsWith('.html'))
    .map(file => path.join(ROOT_DIR, file));

  htmlFiles.forEach(file => {
    const size = getFileSize(file);
    assets.html.push({ file: path.basename(file), size });
  });

  // Find CSS files
  const cssDir = path.join(ROOT_DIR, 'styles');
  if (fs.existsSync(cssDir)) {
    fs.readdirSync(cssDir)
      .filter(file => file.endsWith('.css'))
      .forEach(file => {
        const filePath = path.join(cssDir, file);
        const size = getFileSize(filePath);
        assets.css.push({ file, size });
      });
  }

  // Find JS files
  const jsDir = path.join(ROOT_DIR, 'scripts');
  if (fs.existsSync(jsDir)) {
    fs.readdirSync(jsDir)
      .filter(file => file.endsWith('.js'))
      .forEach(file => {
        const filePath = path.join(jsDir, file);
        const size = getFileSize(filePath);
        assets.js.push({ file, size });
      });
  }

  // Find image files
  const assetsDir = path.join(ROOT_DIR, 'assets');
  if (fs.existsSync(assetsDir)) {
    fs.readdirSync(assetsDir)
      .filter(file => /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(file))
      .forEach(file => {
        const filePath = path.join(assetsDir, file);
        const size = getFileSize(filePath);
        assets.images.push({ file, size });
      });
  }

  // Print summary
  console.log('HTML Files:');
  assets.html.forEach(({ file, size }) => {
    console.log(`  ${file}: ${formatBytes(size)}`);
  });

  console.log('\nCSS Files:');
  assets.css.forEach(({ file, size }) => {
    console.log(`  ${file}: ${formatBytes(size)}`);
  });

  console.log('\nJavaScript Files:');
  assets.js.forEach(({ file, size }) => {
    console.log(`  ${file}: ${formatBytes(size)}`);
  });

  console.log('\nImage Files:');
  assets.images.forEach(({ file, size }) => {
    console.log(`  ${file}: ${formatBytes(size)}`);
  });

  // Calculate totals
  const totalSize = [
    ...assets.html,
    ...assets.css,
    ...assets.js,
    ...assets.images
  ].reduce((sum, { size }) => sum + size, 0);

  console.log(`\n📦 Total assets size: ${formatBytes(totalSize)}`);
  console.log(`\n💡 Tip: Netlify automatically minifies and compresses assets during deployment.\n`);

  return assets;
}

// Run analysis
if (require.main === module) {
  analyzeAssets();
}

module.exports = { analyzeAssets, formatBytes, getFileSize };

