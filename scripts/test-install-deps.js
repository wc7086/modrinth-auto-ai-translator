#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Test the dependency installation logic
async function testInstallDeps() {
  console.log('🧪 Testing dependency installation logic...');
  
  // Create mock environment
  const testDir = './test-install-temp';
  const sourceDir = path.join(testDir, 'modrinth-source');
  
  try {
    // Setup test environment
    console.log('\n1. Setting up test environment...');
    if (fs.existsSync(testDir)) {
      execSync(`rm -rf ${testDir}`, { stdio: 'pipe' });
    }
    fs.mkdirSync(testDir, { recursive: true });
    fs.mkdirSync(sourceDir, { recursive: true });
    
    // Create mock package.json files
    const mockPackageJson = {
      name: 'test-project',
      version: '1.0.0',
      dependencies: {
        'lodash': '^4.17.21'
      },
      scripts: {
        test: 'echo "test"'
      }
    };
    
    // Create package.json in root
    fs.writeFileSync(
      path.join(sourceDir, 'package.json'), 
      JSON.stringify(mockPackageJson, null, 2)
    );
    
    // Create package.json in apps/app-frontend
    const appDir = path.join(sourceDir, 'apps', 'app-frontend');
    fs.mkdirSync(appDir, { recursive: true });
    fs.writeFileSync(
      path.join(appDir, 'package.json'),
      JSON.stringify({
        ...mockPackageJson,
        name: 'app-frontend'
      }, null, 2)
    );
    
    console.log('✅ Test environment created');
    
    // Test 2: Run fallback installation
    console.log('\n2. Testing fallback installation...');
    
    // Save current directory
    const originalCwd = process.cwd();
    
    try {
      // Change to test directory
      process.chdir(testDir);
      
      // Import and run fallback installation
      const { fallbackInstallation } = require('./install-deps.js');
      await fallbackInstallation();
      
      console.log('✅ Fallback installation test passed');
      
    } catch (error) {
      console.error(`❌ Fallback installation test failed: ${error.message}`);
    } finally {
      // Restore original directory
      process.chdir(originalCwd);
    }
    
    // Test 3: Check directory scanning logic
    console.log('\n3. Testing directory scanning...');
    
    const commonDirs = [
      '.',
      'apps/app',
      'apps/app-frontend',
      'packages/app',
      'src'
    ];
    
    let foundDirs = 0;
    for (const dir of commonDirs) {
      const fullPath = path.join(sourceDir, dir);
      const packagePath = path.join(fullPath, 'package.json');
      
      if (fs.existsSync(packagePath)) {
        console.log(`   ✓ Found package.json in: ${dir}`);
        foundDirs++;
      } else {
        console.log(`   - No package.json in: ${dir}`);
      }
    }
    
    console.log(`📊 Found ${foundDirs} directories with package.json`);
    
    // Test 4: Package manager detection
    console.log('\n4. Testing package manager detection...');
    
    const packageManagers = ['pnpm', 'yarn', 'npm'];
    for (const pm of packageManagers) {
      try {
        execSync(`${pm} --version`, { stdio: 'pipe' });
        console.log(`   ✅ ${pm} is available`);
      } catch (error) {
        console.log(`   ❌ ${pm} is not available`);
      }
    }
    
  } finally {
    // Cleanup
    if (fs.existsSync(testDir)) {
      execSync(`rm -rf ${testDir}`, { stdio: 'pipe' });
      console.log('\n🧹 Test environment cleaned up');
    }
  }
}

// Test project analysis integration
async function testProjectAnalysisIntegration() {
  console.log('\n🧪 Testing project analysis integration...');
  
  const analysisPath = path.join(process.cwd(), 'project-analysis.json');
  const hasAnalysis = fs.existsSync(analysisPath);
  
  console.log(`Project analysis exists: ${hasAnalysis ? 'Yes' : 'No'}`);
  
  if (hasAnalysis) {
    try {
      const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));
      console.log(`Analysis project type: ${analysis.projectType}`);
      console.log(`Analysis package manager: ${analysis.packageManager}`);
      console.log(`Analysis package files: ${analysis.packageFiles?.length || 0}`);
    } catch (error) {
      console.warn(`⚠️  Could not read project analysis: ${error.message}`);
    }
  } else {
    console.log('ℹ️  No project analysis found (expected in test environment)');
  }
}

// Main execution
async function main() {
  try {
    await testInstallDeps();
    await testProjectAnalysisIntegration();
    
    console.log('\n🎉 All dependency installation tests completed');
  } catch (error) {
    console.error('❌ Dependency installation test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { testInstallDeps, testProjectAnalysisIntegration };