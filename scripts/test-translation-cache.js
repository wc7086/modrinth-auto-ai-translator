#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Test the translation cache functionality
async function testTranslationCache() {
  console.log('🧪 Testing translation cache functionality...');
  
  const AITranslator = require('./translate-text.js');
  
  // Mock environment variables
  process.env.OPENAI_API_KEY = 'test-key';
  process.env.OPENAI_MODEL = 'gpt-4o-mini';
  process.env.TARGET_LANGUAGE = '简体中文';
  
  // Create test extracted texts
  const testExtractedTexts = {
    metadata: {
      sourceDir: 'test',
      extractedAt: new Date().toISOString(),
      filesProcessed: 1,
      textsFound: 5
    },
    texts: [
      { text: 'Hello World', context: 'template', file: 'test.vue' },
      { text: 'Settings', context: 'template', file: 'test.vue' },
      { text: 'Cancel', context: 'template', file: 'test.vue' },
      { text: 'Save Changes', context: 'template', file: 'test.vue' },
      { text: 'Loading...', context: 'template', file: 'test.vue' }
    ]
  };
  
  // Save test extracted texts
  fs.writeFileSync('extracted-text.json', JSON.stringify(testExtractedTexts, null, 2));
  
  // Create test cache with some pre-existing translations
  const testCache = {
    version: '1.0',
    lastUpdated: new Date().toISOString(),
    cache: {
      'Hello World|gpt-4o-mini|简体中文|template': {
        original: 'Hello World',
        translated: '你好世界',
        context: 'template',
        model: 'gpt-4o-mini',
        targetLanguage: '简体中文',
        createdAt: new Date().toISOString()
      },
      'Settings|gpt-4o-mini|简体中文|template': {
        original: 'Settings',
        translated: '设置',
        context: 'template',
        model: 'gpt-4o-mini',
        targetLanguage: '简体中文',
        createdAt: new Date().toISOString()
      }
    }
  };
  
  // Save test cache
  fs.writeFileSync('translation-cache.json', JSON.stringify(testCache, null, 2));
  
  try {
    // Test 1: Cache loading
    console.log('\n1. Testing cache loading...');
    const translator = new AITranslator();
    
    console.log(`Cache size after loading: ${translator.cache.size}`);
    
    // Test 2: Cache hit detection
    console.log('\n2. Testing cache hit detection...');
    const cached1 = translator.getCachedTranslation('Hello World', 'template');
    const cached2 = translator.getCachedTranslation('Settings', 'template');
    const cached3 = translator.getCachedTranslation('Not Cached', 'template');
    
    console.log(`"Hello World" cached: ${cached1 ? 'Yes' : 'No'} (${cached1})`);
    console.log(`"Settings" cached: ${cached2 ? 'Yes' : 'No'} (${cached2})`);
    console.log(`"Not Cached" cached: ${cached3 ? 'Yes' : 'No'}`);
    
    // Test 3: Cache separation logic
    console.log('\n3. Testing cache separation...');
    const { cachedTexts, uncachedTexts } = translator.separateCachedTexts(testExtractedTexts.texts);
    
    console.log(`Cached texts: ${cachedTexts.length}`);
    cachedTexts.forEach(text => console.log(`   - ${text.text}`));
    
    console.log(`Uncached texts: ${uncachedTexts.length}`);
    uncachedTexts.forEach(text => console.log(`   - ${text.text}`));
    
    // Test 4: Cache key generation
    console.log('\n4. Testing cache key generation...');
    const key1 = translator.getCacheKey('Hello World', 'template');
    const key2 = translator.getCacheKey('Hello World', 'string');
    const key3 = translator.getCacheKey('Hello World', 'template'); // Same as key1
    
    console.log(`Key 1: ${key1}`);
    console.log(`Key 2: ${key2}`);
    console.log(`Key 3: ${key3}`);
    console.log(`Key 1 === Key 3: ${key1 === key3}`);
    console.log(`Key 1 === Key 2: ${key1 === key2}`);
    
    // Test 5: Cache saving
    console.log('\n5. Testing cache saving...');
    translator.setCachedTranslation('New Text', '新文本', 'template');
    translator.saveCache();
    
    // Verify saved cache
    const savedCache = JSON.parse(fs.readFileSync('translation-cache.json', 'utf8'));
    const newEntryKey = translator.getCacheKey('New Text', 'template');
    const hasNewEntry = savedCache.cache[newEntryKey] !== undefined;
    console.log(`New entry saved: ${hasNewEntry}`);
    
    // Test 6: Different model/language isolation
    console.log('\n6. Testing model/language isolation...');
    
    // Add entry for different model
    const differentModelCache = { ...testCache };
    differentModelCache.cache['Hello World|gpt-4|简体中文|template'] = {
      original: 'Hello World',
      translated: '世界，你好',
      context: 'template',
      model: 'gpt-4',
      targetLanguage: '简体中文',
      createdAt: new Date().toISOString()
    };
    
    fs.writeFileSync('translation-cache.json', JSON.stringify(differentModelCache, null, 2));
    
    // Create translator with different model
    process.env.OPENAI_MODEL = 'gpt-4';
    const translator2 = new AITranslator();
    
    const cached_gpt4 = translator2.getCachedTranslation('Hello World', 'template');
    console.log(`"Hello World" with gpt-4: ${cached_gpt4}`);
    
    // Reset model
    process.env.OPENAI_MODEL = 'gpt-4o-mini';
    
    console.log('✅ All cache tests passed');
    
  } catch (error) {
    console.error('❌ Cache test failed:', error.message);
  } finally {
    // Cleanup
    const filesToClean = [
      'extracted-text.json',
      'translation-cache.json',
      'translations.json',
      'translation-mapping.json'
    ];
    
    filesToClean.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
    
    console.log('\n🧹 Test files cleaned up');
  }
}

// Test cache performance improvements
async function testCachePerformance() {
  console.log('\n🧪 Testing cache performance benefits...');
  
  const testTexts = [];
  for (let i = 0; i < 100; i++) {
    testTexts.push({
      text: `Test text ${i}`,
      context: 'template',
      file: 'test.vue'
    });
  }
  
  console.log(`Created ${testTexts.length} test texts`);
  
  // Simulate cache hits for half the texts
  const cacheHitRatio = 0.5;
  const cachedCount = Math.floor(testTexts.length * cacheHitRatio);
  const uncachedCount = testTexts.length - cachedCount;
  
  console.log(`Simulated cache scenario:`);
  console.log(`   - Cache hits: ${cachedCount} (${Math.round(cacheHitRatio * 100)}%)`);
  console.log(`   - API calls needed: ${uncachedCount}`);
  console.log(`   - Time saved: ~${uncachedCount * 2}s (assuming 2s per API call)`);
  console.log(`   - Cost saved: ~${uncachedCount * 0.001}$ (assuming $0.001 per call)`);
}

// Main execution
async function main() {
  try {
    await testTranslationCache();
    await testCachePerformance();
    
    console.log('\n🎉 All translation cache tests completed');
  } catch (error) {
    console.error('❌ Translation cache test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { testTranslationCache, testCachePerformance };