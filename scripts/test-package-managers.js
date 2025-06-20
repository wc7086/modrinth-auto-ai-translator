#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test package manager availability and fallback logic
async function testPackageManagers() {
  console.log('🧪 Testing package manager detection and fallback...');
  
  // Test 1: Check available package managers
  console.log('\n1. Checking available package managers...');
  const packageManagers = ['pnpm', 'yarn', 'npm'];
  const available = [];
  
  for (const pm of packageManagers) {
    try {
      const version = execSync(`${pm} --version`, { stdio: 'pipe', encoding: 'utf8' }).trim();
      console.log(`   ✅ ${pm}: v${version}`);
      available.push(pm);
    } catch (error) {
      console.log(`   ❌ ${pm}: not available`);
    }
  }
  
  console.log(`\nAvailable package managers: ${available.join(', ')}`);
  
  // Test 2: Lock file detection
  console.log('\n2. Testing lock file detection...');
  
  const testDir = './test-pm-temp';
  if (fs.existsSync(testDir)) {
    execSync(`rm -rf ${testDir}`, { stdio: 'pipe' });
  }
  fs.mkdirSync(testDir, { recursive: true });
  
  const lockFileTests = [
    { file: 'pnpm-lock.yaml', expected: 'pnpm', content: 'lockfileVersion: 5.4' },
    { file: 'yarn.lock', expected: 'yarn', content: '# This is a Yarn lockfile' },
    { file: 'package-lock.json', expected: 'npm', content: '{"lockfileVersion": 2}' }
  ];
  
  const { getPackageManagerPriority } = require('./install-deps.js');
  
  for (const test of lockFileTests) {
    const testSubDir = path.join(testDir, test.expected);
    fs.mkdirSync(testSubDir, { recursive: true });
    fs.writeFileSync(path.join(testSubDir, test.file), test.content);
    
    const priority = await getPackageManagerPriority(testSubDir);
    const preferredPM = priority[0];
    
    console.log(`   ${test.file} → ${preferredPM} ${preferredPM === test.expected ? '✅' : '❌'}`);
    console.log(`     Priority: [${priority.join(', ')}]`);
  }
  
  // Test 3: No lock file scenario
  const noLockDir = path.join(testDir, 'no-lock');
  fs.mkdirSync(noLockDir, { recursive: true });
  const defaultPriority = await getPackageManagerPriority(noLockDir);
  console.log(`   No lock file → [${defaultPriority.join(', ')}]`);
  
  // Cleanup
  execSync(`rm -rf ${testDir}`, { stdio: 'pipe' });
  
  // Test 4: Package manager selection logic
  console.log('\n3. Testing package manager selection logic...');
  
  const MultiPlatformBuilder = require('./multi-platform-build.js').MultiPlatformBuilder;
  
  // Mock project analysis
  const mockAnalysis = {
    packageManager: 'pnpm',
    packageFiles: ['package.json']
  };
  
  const builder = new MultiPlatformBuilder();
  builder.projectAnalysis = mockAnalysis;
  
  try {
    const selectedPM = await builder.getAvailablePackageManager();
    console.log(`   Selected package manager: ${selectedPM}`);
    
    if (available.includes('pnpm') && selectedPM === 'pnpm') {
      console.log(`   ✅ Correctly selected preferred pnpm`);
    } else if (selectedPM === available[0]) {
      console.log(`   ✅ Correctly fell back to available: ${selectedPM}`);
    } else {
      console.log(`   ⚠️  Selection logic may need review`);
    }
    
  } catch (error) {
    console.error(`   ❌ Package manager selection failed: ${error.message}`);
  }
  
  // Test 5: Installation command generation
  console.log('\n4. Testing installation commands...');
  
  for (const pm of available) {
    try {
      console.log(`   Testing ${pm} install command...`);
      
      // Create a minimal test package.json
      const testInstallDir = './test-install-temp';
      if (fs.existsSync(testInstallDir)) {
        execSync(`rm -rf ${testInstallDir}`, { stdio: 'pipe' });
      }
      fs.mkdirSync(testInstallDir);
      
      const testPackageJson = {
        name: 'test-install',
        version: '1.0.0',
        dependencies: {}
      };
      
      fs.writeFileSync(
        path.join(testInstallDir, 'package.json'),
        JSON.stringify(testPackageJson, null, 2)
      );
      
      // Test dry run (just validate command)
      execSync(`${pm} install --dry-run`, { 
        cwd: testInstallDir, 
        stdio: 'pipe',
        timeout: 30000 
      });
      
      console.log(`   ✅ ${pm} install command works`);
      
      // Cleanup
      execSync(`rm -rf ${testInstallDir}`, { stdio: 'pipe' });
      
    } catch (error) {
      console.log(`   ❌ ${pm} install command failed: ${error.message.split('\n')[0]}`);
    }
  }
}

// Test GitHub Actions environment simulation
async function testGitHubActionsEnvironment() {
  console.log('\n🧪 Testing GitHub Actions environment simulation...');
  
  // Check if we're in a GitHub Actions-like environment
  const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
  console.log(`GitHub Actions environment: ${isGitHubActions ? 'Yes' : 'No'}`);
  
  if (!isGitHubActions) {
    console.log('Simulating GitHub Actions environment...');
    
    // Test what would happen if pnpm was not available
    console.log('\n📋 Simulating missing pnpm scenario:');
    console.log('   1. Project requires pnpm (detected from lock file)');
    console.log('   2. pnpm not installed in environment');
    console.log('   3. System should fall back to npm or yarn');
    console.log('   4. Installation should succeed with fallback');
    
    // Test the workflow steps that would run
    console.log('\n🔧 Recommended workflow steps for pnpm support:');
    console.log('   1. Setup Node.js');
    console.log('   2. Setup pnpm (using pnpm/action-setup@v4)');
    console.log('   3. Run dependency installation');
    console.log('   4. Fallback to npm/yarn if pnpm fails');
  }
}

// Main execution
async function main() {
  try {
    await testPackageManagers();
    await testGitHubActionsEnvironment();
    
    console.log('\n🎉 All package manager tests completed');
  } catch (error) {
    console.error('❌ Package manager test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { testPackageManagers, testGitHubActionsEnvironment };