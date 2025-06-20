#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Smart dependency installation script
async function installDependencies() {
  console.log('📦 Installing dependencies...');
  
  try {
    // Check if project analysis exists, if not, run it first
    const analysisPath = path.join(process.cwd(), 'project-analysis.json');
    if (!fs.existsSync(analysisPath)) {
      console.log('🔍 Project analysis not found, running analysis first...');
      
      // Check if modrinth-source exists
      const sourceDir = 'modrinth-source';
      if (!fs.existsSync(sourceDir)) {
        throw new Error('modrinth-source directory not found. Make sure the source code is cloned first.');
      }
      
      // Run project analysis
      execSync(`node scripts/analyze-project.js ${sourceDir}`, { 
        stdio: 'inherit',
        timeout: 300000 // 5 minutes
      });
      
      console.log('✅ Project analysis completed');
    }
    
    // Now run the dependency installation
    const { installDependencies: installDeps } = require('./multi-platform-build.js');
    await installDeps();
    
    console.log('✅ Dependencies installed successfully');
    
  } catch (error) {
    console.error('❌ Dependency installation failed:', error.message);
    
    // Fallback: try basic dependency installation
    await fallbackInstallation();
  }
}

// Get package manager priority based on lock files
async function getPackageManagerPriority(projectPath) {
  const lockFiles = [
    { file: 'pnpm-lock.yaml', manager: 'pnpm' },
    { file: 'yarn.lock', manager: 'yarn' },
    { file: 'package-lock.json', manager: 'npm' }
  ];
  
  // Check for lock files to determine preferred package manager
  for (const { file, manager } of lockFiles) {
    if (fs.existsSync(path.join(projectPath, file))) {
      console.log(`   Found ${file}, preferring ${manager}`);
      return [manager, 'npm', 'yarn', 'pnpm'].filter((pm, index, arr) => arr.indexOf(pm) === index);
    }
  }
  
  // Default order if no lock files found
  return ['npm', 'yarn', 'pnpm'];
}

// Fallback installation method that doesn't require project analysis
async function fallbackInstallation() {
  console.log('🔄 Attempting fallback dependency installation...');
  
  try {
    const sourceDir = 'modrinth-source';
    if (!fs.existsSync(sourceDir)) {
      console.warn('⚠️  Source directory not found, skipping dependency installation');
      return;
    }
    
    // Common directories to check for package.json
    const commonDirs = [
      '.',
      'apps/app',
      'apps/app-frontend',
      'packages/app',
      'src'
    ];
    
    for (const dir of commonDirs) {
      const fullPath = path.join(sourceDir, dir);
      const packagePath = path.join(fullPath, 'package.json');
      
      if (fs.existsSync(packagePath)) {
        console.log(`📦 Installing dependencies in: ${dir}`);
        
        try {
          // Try different package managers with smart ordering
          const packageManagers = await getPackageManagerPriority(fullPath);
          let installed = false;
          
          for (const pm of packageManagers) {
            try {
              // Check if package manager is available
              execSync(`${pm} --version`, { stdio: 'pipe' });
              
              // Install dependencies
              console.log(`   Using ${pm}...`);
              execSync(`${pm} install`, { 
                cwd: fullPath, 
                stdio: 'pipe',
                timeout: 300000 // 5 minutes
              });
              
              console.log(`   ✓ Dependencies installed in ${dir} with ${pm}`);
              installed = true;
              break;
              
            } catch (pmError) {
              console.log(`   ${pm} not available or failed: ${pmError.message.split('\n')[0]}`);
              continue;
            }
          }
          
          if (!installed) {
            console.warn(`   ⚠️  Could not install dependencies in ${dir}`);
          }
          
        } catch (installError) {
          console.warn(`   ⚠️  Failed to install dependencies in ${dir}: ${installError.message}`);
        }
      }
    }
    
    console.log('✅ Fallback installation completed');
    
  } catch (error) {
    console.error('❌ Fallback installation failed:', error.message);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await installDependencies();
  } catch (error) {
    console.error('❌ Installation process failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { installDependencies, fallbackInstallation, getPackageManagerPriority };