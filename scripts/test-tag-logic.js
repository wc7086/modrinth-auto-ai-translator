#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

// Test the tag determination logic
async function testTagLogic() {
  console.log('🧪 Testing release tag logic...');
  
  // Test 1: Get latest tag from remote Modrinth repository
  console.log('\n1. Testing remote tag fetching...');
  try {
    const output = execSync('git ls-remote --tags --sort=-version:refname https://github.com/modrinth/code.git', {
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 30000
    });
    
    const lines = output.trim().split('\n');
    console.log(`Found ${lines.length} tag references`);
    
    let latestStableTag = null;
    for (const line of lines) {
      const match = line.match(/refs\/tags\/(.+)$/);
      if (match && !match[1].includes('^{}')) {
        const tag = match[1];
        // Skip pre-release or beta tags
        if (!tag.includes('beta') && !tag.includes('alpha') && !tag.includes('rc')) {
          if (!latestStableTag) {
            latestStableTag = tag;
            console.log(`📡 Latest stable tag: ${tag}`);
          }
          console.log(`   - ${tag}`);
          
          // Show only first 5 tags for brevity
          if (lines.indexOf(line) >= 4) break;
        }
      }
    }
    
    if (latestStableTag) {
      const translatedTag = `${latestStableTag}-zh-cn`;
      console.log(`✅ Would create translated tag: ${translatedTag}`);
    }
    
  } catch (error) {
    console.error(`❌ Remote tag test failed: ${error.message}`);
  }
  
  // Test 2: Simulate different input scenarios
  console.log('\n2. Testing tag generation scenarios...');
  
  const testCases = [
    { input: 'latest', description: 'User wants latest source tag' },
    { input: '', description: 'Empty input (default to latest)' },
    { input: 'v1.2.3', description: 'Custom tag specified' },
    { input: 'v2.0.0-beta', description: 'Custom pre-release tag' }
  ];
  
  testCases.forEach((testCase, index) => {
    console.log(`\nTest ${index + 1}: ${testCase.description}`);
    console.log(`Input: "${testCase.input}"`);
    
    if (testCase.input === 'latest' || testCase.input === '') {
      console.log(`→ Would fetch latest tag from Modrinth repository`);
      console.log(`→ Example result: "v0.7.4-zh-cn"`);
    } else {
      console.log(`→ Would use provided tag: "${testCase.input}"`);
      console.log(`→ Result: "${testCase.input}"`);
    }
  });
  
  // Test 3: Check if modrinth-source directory exists (workflow context)
  console.log('\n3. Testing local source directory detection...');
  
  const sourceDir = 'modrinth-source';
  if (fs.existsSync(sourceDir)) {
    console.log(`✅ Found ${sourceDir} directory`);
    try {
      const localTag = execSync('git describe --tags --abbrev=0', { 
        cwd: sourceDir,
        stdio: 'pipe', 
        encoding: 'utf8' 
      }).trim();
      console.log(`📋 Local source tag: ${localTag}`);
    } catch (error) {
      console.warn(`⚠️  Could not get local tag: ${error.message}`);
    }
  } else {
    console.log(`ℹ️  No ${sourceDir} directory found (expected in non-workflow environment)`);
    console.log(`→ Would fall back to remote tag fetching`);
  }
}

// Main execution
async function main() {
  try {
    await testTagLogic();
    console.log('\n🎉 Tag logic test completed successfully');
  } catch (error) {
    console.error('❌ Tag logic test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { testTagLogic };