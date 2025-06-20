#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class MultiPlatformBuilder {
  constructor() {
    this.buildResults = [];
    this.projectAnalysis = null;
    this.buildArtifacts = [];
    this.reportData = {
      startTime: new Date().toISOString(),
      builds: [],
      artifacts: [],
      errors: []
    };
  }

  async build() {
    console.log(`🏗️  Starting multi-platform build process`);
    
    // Load project analysis
    await this.loadProjectAnalysis();
    
    // Install dependencies
    await this.installDependencies();
    
    // Determine build strategy
    const buildStrategy = this.determineBuildStrategy();
    console.log(`📋 Build strategy: ${buildStrategy}`);
    
    // Execute builds based on strategy
    await this.executeBuildStrategy(buildStrategy);
    
    // Collect artifacts
    await this.collectArtifacts();
    
    // Generate build report
    await this.generateBuildReport();
    
    console.log(`✅ Multi-platform build completed`);
    console.log(`📦 Artifacts created: ${this.buildArtifacts.length}`);
  }

  async loadProjectAnalysis() {
    const analysisPath = path.join(process.cwd(), 'project-analysis.json');
    
    if (!fs.existsSync(analysisPath)) {
      throw new Error('project-analysis.json not found. Run analyze-project.js first.');
    }
    
    this.projectAnalysis = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));
    console.log(`📊 Loaded project analysis: ${this.projectAnalysis.projectType}`);
  }

  async installDependencies() {
    console.log(`📦 Installing dependencies...`);
    
    try {
      // Verify package manager availability and get fallback options
      const packageManager = await this.getAvailablePackageManager();
      console.log(`📋 Using package manager: ${packageManager}`);
      
      // Install dependencies in all relevant directories
      const packageDirs = new Set();
      
      // Add root directory if it has package.json
      if (this.projectAnalysis.packageFiles.some(p => path.dirname(p) === '.')) {
        packageDirs.add('.');
      }
      
      // Add other package directories
      this.projectAnalysis.packageFiles.forEach(pkgPath => {
        const dir = path.dirname(pkgPath);
        if (dir !== '.') {
          packageDirs.add(dir);
        }
      });
      
      // Install in each directory
      for (const dir of packageDirs) {
        const fullPath = path.resolve(dir);
        console.log(`   Installing in: ${dir}`);
        
        try {
          const cmd = `${packageManager} install`;
          execSync(cmd, { 
            cwd: fullPath, 
            stdio: 'pipe',
            timeout: 300000 // 5 minutes timeout
          });
          console.log(`   ✓ Dependencies installed in ${dir} with ${packageManager}`);
        } catch (error) {
          console.warn(`   ⚠️  Failed to install dependencies in ${dir}: ${error.message}`);
          
          // Try fallback package managers
          const installed = await this.tryFallbackInstall(fullPath, dir);
          if (!installed) {
            this.reportData.errors.push({
              step: 'dependency-install',
              directory: dir,
              error: error.message
            });
          }
        }
      }
      
    } catch (error) {
      console.error(`❌ Dependency installation failed: ${error.message}`);
      throw error;
    }
  }

  async getAvailablePackageManager() {
    // Preferred order based on project analysis
    const preferredPM = this.projectAnalysis.packageManager || 'npm';
    const packageManagers = [preferredPM, 'pnpm', 'yarn', 'npm'].filter((pm, index, arr) => arr.indexOf(pm) === index);
    
    for (const pm of packageManagers) {
      try {
        execSync(`${pm} --version`, { stdio: 'pipe' });
        return pm;
      } catch (error) {
        console.log(`   ${pm} not available`);
      }
    }
    
    throw new Error('No package manager available (pnpm, yarn, npm)');
  }

  async tryFallbackInstall(fullPath, dir) {
    const fallbackManagers = ['npm', 'yarn', 'pnpm'];
    
    for (const pm of fallbackManagers) {
      try {
        execSync(`${pm} --version`, { stdio: 'pipe' });
        console.log(`   🔄 Trying fallback: ${pm}`);
        
        execSync(`${pm} install`, { 
          cwd: fullPath, 
          stdio: 'pipe',
          timeout: 300000
        });
        
        console.log(`   ✓ Dependencies installed in ${dir} with ${pm} (fallback)`);
        return true;
      } catch (error) {
        console.log(`   ❌ ${pm} fallback failed`);
      }
    }
    
    return false;
  }

  determineBuildStrategy() {
    if (this.projectAnalysis.hasTauri) {
      return 'tauri';
    } else if (this.projectAnalysis.hasElectron) {
      return 'electron';
    } else if (this.projectAnalysis.framework === 'Vue' || this.projectAnalysis.framework === 'React') {
      return 'web-app';
    } else {
      return 'generic';
    }
  }

  async executeBuildStrategy(strategy) {
    switch (strategy) {
      case 'tauri':
        await this.buildTauri();
        break;
      case 'electron':
        await this.buildElectron();
        break;
      case 'web-app':
        await this.buildWebApp();
        break;
      case 'generic':
        await this.buildGeneric();
        break;
      default:
        throw new Error(`Unknown build strategy: ${strategy}`);
    }
  }

  async buildTauri() {
    console.log(`🦀 Building Tauri applications...`);
    
    const platforms = [
      { name: 'linux-x64', target: 'x86_64-unknown-linux-gnu' },
      { name: 'windows-x64', target: 'x86_64-pc-windows-gnu' },
      { name: 'macos-x64', target: 'x86_64-apple-darwin' },
      { name: 'macos-arm64', target: 'aarch64-apple-darwin' }
    ];
    
    // Find Tauri build commands
    const tauriBuildCommands = this.projectAnalysis.buildCommands.filter(
      cmd => cmd.type === 'tauri-build' || cmd.command.includes('tauri')
    );
    
    if (tauriBuildCommands.length === 0) {
      // Fallback to standard Tauri commands
      tauriBuildCommands.push({
        directory: this.projectAnalysis.appDirectory || '.',
        command: `${this.projectAnalysis.packageManager} run tauri build`,
        type: 'tauri-build'
      });
    }
    
    for (const buildCmd of tauriBuildCommands) {
      for (const platform of platforms) {
        await this.executeTauriBuild(buildCmd, platform);
      }
    }
  }

  async executeTauriBuild(buildCmd, platform) {
    console.log(`   Building for ${platform.name}...`);
    
    try {
      const buildDir = path.resolve(buildCmd.directory);
      const cmd = `${buildCmd.command} --target ${platform.target}`;
      
      const startTime = Date.now();
      execSync(cmd, { 
        cwd: buildDir, 
        stdio: 'pipe',
        timeout: 1800000 // 30 minutes timeout
      });
      const duration = Date.now() - startTime;
      
      console.log(`   ✓ ${platform.name} build completed in ${Math.round(duration/1000)}s`);
      
      this.reportData.builds.push({
        platform: platform.name,
        target: platform.target,
        command: cmd,
        directory: buildCmd.directory,
        duration,
        success: true
      });
      
      // Look for build artifacts
      await this.findTauriArtifacts(buildDir, platform);
      
    } catch (error) {
      console.error(`   ❌ ${platform.name} build failed: ${error.message}`);
      
      this.reportData.builds.push({
        platform: platform.name,
        target: platform.target,
        command: buildCmd.command,
        directory: buildCmd.directory,
        success: false,
        error: error.message
      });
      
      this.reportData.errors.push({
        step: 'tauri-build',
        platform: platform.name,
        error: error.message
      });
    }
  }

  async findTauriArtifacts(buildDir, platform) {
    const targetDir = path.join(buildDir, 'src-tauri', 'target', platform.target, 'release');
    
    if (!fs.existsSync(targetDir)) {
      return;
    }
    
    const files = fs.readdirSync(targetDir);
    const extensions = platform.name.includes('windows') ? ['.exe'] : [''];
    
    for (const file of files) {
      const ext = path.extname(file);
      if (extensions.includes(ext) || !path.extname(file)) {
        const filePath = path.join(targetDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isFile() && stats.size > 1024 * 1024) { // Larger than 1MB
          this.buildArtifacts.push({
            platform: platform.name,
            file: filePath,
            name: file,
            size: stats.size,
            type: 'tauri-executable'
          });
        }
      }
    }
  }

  async buildElectron() {
    console.log(`⚡ Building Electron applications...`);
    
    const platforms = [
      { name: 'linux-x64', electronPlatform: 'linux', arch: 'x64' },
      { name: 'windows-x64', electronPlatform: 'win32', arch: 'x64' },
      { name: 'macos-x64', electronPlatform: 'darwin', arch: 'x64' },
      { name: 'macos-arm64', electronPlatform: 'darwin', arch: 'arm64' }
    ];
    
    // Install electron-builder if not present
    await this.ensureElectronBuilder();
    
    for (const platform of platforms) {
      await this.executeElectronBuild(platform);
    }
  }

  async ensureElectronBuilder() {
    try {
      execSync('npx electron-builder --version', { stdio: 'pipe' });
    } catch (error) {
      console.log(`   Installing electron-builder...`);
      execSync(`${this.projectAnalysis.packageManager} add -D electron-builder`, { stdio: 'pipe' });
    }
  }

  async executeElectronBuild(platform) {
    console.log(`   Building for ${platform.name}...`);
    
    try {
      const buildDir = path.resolve(this.projectAnalysis.appDirectory || '.');
      const cmd = `npx electron-builder --${platform.electronPlatform} --${platform.arch}`;
      
      const startTime = Date.now();
      execSync(cmd, { 
        cwd: buildDir, 
        stdio: 'pipe',
        timeout: 1800000 // 30 minutes timeout
      });
      const duration = Date.now() - startTime;
      
      console.log(`   ✓ ${platform.name} build completed in ${Math.round(duration/1000)}s`);
      
      this.reportData.builds.push({
        platform: platform.name,
        command: cmd,
        directory: buildDir,
        duration,
        success: true
      });
      
      // Look for build artifacts
      await this.findElectronArtifacts(buildDir, platform);
      
    } catch (error) {
      console.error(`   ❌ ${platform.name} build failed: ${error.message}`);
      
      this.reportData.builds.push({
        platform: platform.name,
        command: `npx electron-builder --${platform.electronPlatform} --${platform.arch}`,
        success: false,
        error: error.message
      });
      
      this.reportData.errors.push({
        step: 'electron-build',
        platform: platform.name,
        error: error.message
      });
    }
  }

  async findElectronArtifacts(buildDir, platform) {
    const distDir = path.join(buildDir, 'dist');
    
    if (!fs.existsSync(distDir)) {
      return;
    }
    
    const files = fs.readdirSync(distDir, { recursive: true });
    const extensions = ['.exe', '.dmg', '.pkg', '.AppImage', '.deb', '.rpm', '.zip', '.tar.gz'];
    
    for (const file of files) {
      const ext = path.extname(file);
      if (extensions.includes(ext)) {
        const filePath = path.join(distDir, file);
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          
          this.buildArtifacts.push({
            platform: platform.name,
            file: filePath,
            name: path.basename(file),
            size: stats.size,
            type: 'electron-package'
          });
        }
      }
    }
  }

  async buildWebApp() {
    console.log(`🌐 Building web application...`);
    
    // Find build commands
    const buildCommands = this.projectAnalysis.buildCommands.filter(
      cmd => cmd.type === 'build'
    );
    
    if (buildCommands.length === 0) {
      // Fallback build commands
      buildCommands.push({
        directory: this.projectAnalysis.appDirectory || '.',
        command: `${this.projectAnalysis.packageManager} run build`,
        type: 'build'
      });
    }
    
    for (const buildCmd of buildCommands) {
      await this.executeWebBuild(buildCmd);
    }
  }

  async executeWebBuild(buildCmd) {
    console.log(`   Executing: ${buildCmd.command}`);
    
    try {
      const buildDir = path.resolve(buildCmd.directory);
      
      const startTime = Date.now();
      execSync(buildCmd.command, { 
        cwd: buildDir, 
        stdio: 'pipe',
        timeout: 600000 // 10 minutes timeout
      });
      const duration = Date.now() - startTime;
      
      console.log(`   ✓ Web build completed in ${Math.round(duration/1000)}s`);
      
      this.reportData.builds.push({
        platform: 'web',
        command: buildCmd.command,
        directory: buildCmd.directory,
        duration,
        success: true
      });
      
      // Look for build artifacts
      await this.findWebArtifacts(buildDir);
      
    } catch (error) {
      console.error(`   ❌ Web build failed: ${error.message}`);
      
      this.reportData.builds.push({
        platform: 'web',
        command: buildCmd.command,
        directory: buildCmd.directory,
        success: false,
        error: error.message
      });
      
      this.reportData.errors.push({
        step: 'web-build',
        error: error.message
      });
    }
  }

  async findWebArtifacts(buildDir) {
    const commonDistPaths = ['dist', 'build', '.next', '.nuxt/dist'];
    
    for (const distPath of commonDistPaths) {
      const fullDistPath = path.join(buildDir, distPath);
      
      if (fs.existsSync(fullDistPath)) {
        // Create a zip of the dist directory
        const zipName = `web-build-${Date.now()}.zip`;
        const zipPath = path.join(process.cwd(), zipName);
        
        try {
          execSync(`cd "${fullDistPath}" && zip -r "${zipPath}" .`, { stdio: 'pipe' });
          
          const stats = fs.statSync(zipPath);
          this.buildArtifacts.push({
            platform: 'web',
            file: zipPath,
            name: zipName,
            size: stats.size,
            type: 'web-build-archive'
          });
          
        } catch (error) {
          console.warn(`   ⚠️  Failed to create web build archive: ${error.message}`);
        }
        
        break;
      }
    }
  }

  async buildGeneric() {
    console.log(`🔧 Executing generic build commands...`);
    
    if (this.projectAnalysis.buildCommands.length === 0) {
      console.log(`   No build commands found, trying common patterns...`);
      
      // Try common build commands
      const commonCommands = [
        `${this.projectAnalysis.packageManager} run build`,
        `${this.projectAnalysis.packageManager} run compile`,
        `make build`,
        `make all`
      ];
      
      for (const cmd of commonCommands) {
        try {
          execSync(cmd, { stdio: 'pipe', timeout: 600000 });
          console.log(`   ✓ Successfully executed: ${cmd}`);
          break;
        } catch (error) {
          console.log(`   ⚠️  Failed: ${cmd}`);
        }
      }
    } else {
      // Execute configured build commands
      for (const buildCmd of this.projectAnalysis.buildCommands) {
        await this.executeGenericBuild(buildCmd);
      }
    }
  }

  async executeGenericBuild(buildCmd) {
    console.log(`   Executing: ${buildCmd.command}`);
    
    try {
      const buildDir = path.resolve(buildCmd.directory);
      
      const startTime = Date.now();
      execSync(buildCmd.command, { 
        cwd: buildDir, 
        stdio: 'pipe',
        timeout: 600000 // 10 minutes timeout
      });
      const duration = Date.now() - startTime;
      
      console.log(`   ✓ Build completed in ${Math.round(duration/1000)}s`);
      
      this.reportData.builds.push({
        platform: 'generic',
        command: buildCmd.command,
        directory: buildCmd.directory,
        duration,
        success: true
      });
      
    } catch (error) {
      console.error(`   ❌ Build failed: ${error.message}`);
      
      this.reportData.builds.push({
        platform: 'generic',
        command: buildCmd.command,
        directory: buildCmd.directory,
        success: false,
        error: error.message
      });
    }
  }

  async collectArtifacts() {
    console.log(`📦 Collecting build artifacts...`);
    
    // Create artifacts directory
    const artifactsDir = path.join(process.cwd(), 'build-artifacts');
    if (!fs.existsSync(artifactsDir)) {
      fs.mkdirSync(artifactsDir, { recursive: true });
    }
    
    // Copy all artifacts to the artifacts directory
    for (const artifact of this.buildArtifacts) {
      try {
        const destPath = path.join(artifactsDir, `${artifact.platform}-${artifact.name}`);
        fs.copyFileSync(artifact.file, destPath);
        
        artifact.artifactPath = destPath;
        this.reportData.artifacts.push(artifact);
        
        console.log(`   ✓ Collected: ${artifact.name} (${Math.round(artifact.size/1024/1024)}MB)`);
      } catch (error) {
        console.warn(`   ⚠️  Failed to collect ${artifact.name}: ${error.message}`);
      }
    }
  }

  async generateBuildReport() {
    this.reportData.endTime = new Date().toISOString();
    
    const reportPath = path.join(process.cwd(), 'build-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.reportData, null, 2));
    
    console.log(`📋 Build report saved to: ${reportPath}`);
  }
}

// Utility function to run installs
async function installDependencies() {
  const installer = new MultiPlatformBuilder();
  await installer.loadProjectAnalysis();
  await installer.installDependencies();
}

// Main execution
async function main() {
  try {
    const builder = new MultiPlatformBuilder();
    await builder.build();
    
    console.log('✅ Multi-platform build completed successfully');
  } catch (error) {
    console.error('❌ Multi-platform build failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { MultiPlatformBuilder, installDependencies };