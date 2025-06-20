#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Debug package manager installation issues
async function debugPackageManagers() {
  console.log('🔧 Debugging package manager installation...');
  
  // Test 1: Check environment
  console.log('\n1. Environment Check:');
  console.log(`   Platform: ${process.platform}`);
  console.log(`   Architecture: ${process.arch}`);
  console.log(`   Node version: ${process.version}`);
  console.log(`   Working directory: ${process.cwd()}`);
  
  // Test 2: Check PATH
  console.log('\n2. PATH Analysis:');
  const pathEntries = process.env.PATH.split(path.delimiter);
  console.log(`   PATH entries: ${pathEntries.length}`);
  pathEntries.slice(0, 10).forEach((entry, index) => {
    console.log(`     ${index + 1}. ${entry}`);
  });
  if (pathEntries.length > 10) {
    console.log(`     ... and ${pathEntries.length - 10} more`);
  }
  
  // Test 3: Package manager detection
  console.log('\n3. Package Manager Detection:');
  const packageManagers = [
    { name: 'node', cmd: 'node --version' },
    { name: 'npm', cmd: 'npm --version' },
    { name: 'pnpm', cmd: 'pnpm --version' },
    { name: 'yarn', cmd: 'yarn --version' }
  ];
  
  for (const pm of packageManagers) {
    try {
      const version = execSync(pm.cmd, { stdio: 'pipe', encoding: 'utf8' }).trim();
      console.log(`   ✅ ${pm.name}: v${version}`);
      
      // Try which command
      try {
        const location = execSync(`which ${pm.name}`, { stdio: 'pipe', encoding: 'utf8' }).trim();
        console.log(`      Location: ${location}`);
      } catch (error) {
        console.log(`      Location: not found in PATH`);
      }
      
    } catch (error) {
      console.log(`   ❌ ${pm.name}: not available`);
      console.log(`      Error: ${error.message.split('\n')[0]}`);
    }
  }
  
  // Test 4: Manual pnpm installation
  console.log('\n4. Manual pnpm Installation Test:');
  try {
    console.log('   Attempting to install pnpm globally...');
    execSync('npm install -g pnpm@8', { 
      stdio: 'pipe',
      timeout: 60000,
      encoding: 'utf8'
    });
    
    // Check if pnpm is now available
    const pnpmVersion = execSync('pnpm --version', { stdio: 'pipe', encoding: 'utf8' }).trim();
    console.log(`   ✅ pnpm installation successful: v${pnpmVersion}`);
    
  } catch (error) {
    console.log(`   ❌ pnpm installation failed: ${error.message.split('\n')[0]}`);
  }
  
  // Test 5: Simulate dependency installation
  console.log('\n5. Dependency Installation Simulation:');
  
  const testDir = './test-deps-temp';
  if (fs.existsSync(testDir)) {
    execSync(`rm -rf ${testDir}`, { stdio: 'pipe' });
  }
  fs.mkdirSync(testDir);
  
  // Create test package.json
  const testPackageJson = {
    name: 'test-deps',
    version: '1.0.0',
    dependencies: {
      'lodash': '^4.17.21'
    }
  };
  
  fs.writeFileSync(
    path.join(testDir, 'package.json'),
    JSON.stringify(testPackageJson, null, 2)
  );
  
  // Test each available package manager
  const testPMs = ['npm', 'pnpm', 'yarn'];
  for (const pm of testPMs) {
    try {
      console.log(`   Testing ${pm} install...`);
      
      // Check availability first
      execSync(`${pm} --version`, { stdio: 'pipe' });
      
      // Try installation
      execSync(`${pm} install`, { 
        cwd: testDir,
        stdio: 'pipe',
        timeout: 30000
      });
      
      console.log(`   ✅ ${pm} install successful`);
      
      // Check if node_modules was created
      const nodeModulesPath = path.join(testDir, 'node_modules');
      if (fs.existsSync(nodeModulesPath)) {
        const lodashPath = path.join(nodeModulesPath, 'lodash');
        if (fs.existsSync(lodashPath)) {
          console.log(`      ✓ lodash dependency installed`);
        } else {
          console.log(`      ⚠️  lodash dependency not found`);
        }
      } else {
        console.log(`      ⚠️  node_modules not created`);
      }
      
      // Clean up for next test
      if (fs.existsSync(nodeModulesPath)) {
        execSync(`rm -rf ${nodeModulesPath}`, { stdio: 'pipe' });
      }
      
    } catch (error) {
      console.log(`   ❌ ${pm} install failed: ${error.message.split('\n')[0]}`);
    }
  }
  
  // Cleanup
  execSync(`rm -rf ${testDir}`, { stdio: 'pipe' });
  
  // Test 6: GitHub Actions specific checks
  console.log('\n6. GitHub Actions Environment:');
  const githubEnvVars = [
    'GITHUB_ACTIONS',
    'GITHUB_WORKFLOW',
    'GITHUB_RUN_ID',
    'RUNNER_OS',
    'RUNNER_ARCH'
  ];
  
  githubEnvVars.forEach(envVar => {
    const value = process.env[envVar];
    console.log(`   ${envVar}: ${value || 'not set'}`);
  });
  
  console.log('\n💡 Recommendations:');
  console.log('   1. Ensure pnpm/action-setup@v4 runs before dependency installation');
  console.log('   2. Add package manager verification step to workflow');
  console.log('   3. Use fallback installation with detailed error reporting');
  console.log('   4. Consider using npm as primary fallback in GitHub Actions');
}

// Test workflow simulation
async function simulateWorkflowSteps() {
  console.log('\n🧪 Simulating GitHub Actions workflow steps...');
  
  const workflowSteps = [
    'Checkout repository',
    'Setup Node.js',
    'Setup pnpm',
    'Verify package managers',
    'Clone source repository',
    'Analyze project structure',
    'Install dependencies',
    'Build application'
  ];
  
  console.log('\n📋 Recommended workflow order:');
  workflowSteps.forEach((step, index) => {
    console.log(`   ${index + 1}. ${step}`);
  });
  
  console.log('\n🔧 Debugging steps if dependency installation fails:');
  const debugSteps = [
    'Check if pnpm is in PATH: which pnpm',
    'Check pnpm version: pnpm --version',
    'Try manual install: npm install -g pnpm@8',
    'Check package.json exists in target directory',
    'Try npm as fallback: npm install',
    'Check directory permissions and disk space'
  ];
  
  debugSteps.forEach((step, index) => {
    console.log(`   ${index + 1}. ${step}`);
  });
}

// Main execution
async function main() {
  try {
    await debugPackageManagers();
    await simulateWorkflowSteps();
    
    console.log('\n🎉 Package manager debugging completed');
  } catch (error) {
    console.error('❌ Package manager debugging failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { debugPackageManagers, simulateWorkflowSteps };