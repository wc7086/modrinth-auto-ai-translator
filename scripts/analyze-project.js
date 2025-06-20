#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class ProjectAnalyzer {
  constructor(sourceDir) {
    this.sourceDir = sourceDir;
    this.analysis = {
      projectType: null,
      buildTool: null,
      packageManager: null,
      framework: null,
      hasElectron: false,
      hasTauri: false,
      buildCommands: [],
      appDirectory: null,
      frontendDirectory: null,
      packageFiles: [],
      configs: {}
    };
  }

  async analyze() {
    console.log(`🔍 Analyzing project structure: ${this.sourceDir}`);
    
    if (!fs.existsSync(this.sourceDir)) {
      throw new Error(`Source directory does not exist: ${this.sourceDir}`);
    }

    // First, identify if this is a monorepo
    await this.detectMonorepoStructure();
    
    // Analyze package.json files
    await this.analyzePackageFiles();
    
    // Detect build tools and frameworks
    await this.detectBuildSystem();
    
    // Find app directories
    await this.findAppDirectories();
    
    // Detect desktop app framework
    await this.detectDesktopFramework();
    
    // Determine build commands
    await this.determineBuildCommands();
    
    console.log('📊 Project Analysis Results:');
    console.log(`   - Project Type: ${this.analysis.projectType}`);
    console.log(`   - Build Tool: ${this.analysis.buildTool}`);
    console.log(`   - Package Manager: ${this.analysis.packageManager}`);
    console.log(`   - Framework: ${this.analysis.framework}`);
    console.log(`   - Desktop Framework: ${this.analysis.hasElectron ? 'Electron' : this.analysis.hasTauri ? 'Tauri' : 'None'}`);
    console.log(`   - App Directory: ${this.analysis.appDirectory}`);
    console.log(`   - Frontend Directory: ${this.analysis.frontendDirectory}`);
    
    // Save analysis results
    const outputPath = path.join(process.cwd(), 'project-analysis.json');
    fs.writeFileSync(outputPath, JSON.stringify(this.analysis, null, 2));
    console.log(`✅ Analysis saved to: ${outputPath}`);
    
    return this.analysis;
  }

  async detectMonorepoStructure() {
    // Check for monorepo indicators
    const rootPackagePath = path.join(this.sourceDir, 'package.json');
    const workspacesFiles = [
      'lerna.json',
      'nx.json',
      'rush.json',
      'pnpm-workspace.yaml',
      '.yarnrc.yml'
    ];
    
    let isMonorepo = false;
    
    if (fs.existsSync(rootPackagePath)) {
      try {
        const rootPackage = JSON.parse(fs.readFileSync(rootPackagePath, 'utf8'));
        if (rootPackage.workspaces || rootPackage.private) {
          isMonorepo = true;
        }
      } catch (error) {
        console.warn(`⚠️  Error reading root package.json: ${error.message}`);
      }
    }
    
    // Check for workspace config files
    for (const file of workspacesFiles) {
      if (fs.existsSync(path.join(this.sourceDir, file))) {
        isMonorepo = true;
        break;
      }
    }
    
    this.analysis.projectType = isMonorepo ? 'monorepo' : 'single-package';
    
    // Look for common monorepo directories
    const commonDirs = ['apps', 'packages', 'libs', 'projects'];
    for (const dir of commonDirs) {
      const dirPath = path.join(this.sourceDir, dir);
      if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        this.analysis.projectType = 'monorepo';
        break;
      }
    }
  }

  async analyzePackageFiles() {
    const packageFiles = [];
    await this.findPackageFiles(this.sourceDir, packageFiles);
    
    this.analysis.packageFiles = packageFiles;
    
    // Analyze each package.json for insights
    for (const pkgPath of packageFiles) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const relativePath = path.relative(this.sourceDir, pkgPath);
        
        // Store package info
        this.analysis.configs[relativePath] = pkg;
        
        // Detect package manager from lock files
        const dir = path.dirname(pkgPath);
        if (fs.existsSync(path.join(dir, 'pnpm-lock.yaml'))) {
          this.analysis.packageManager = 'pnpm';
        } else if (fs.existsSync(path.join(dir, 'yarn.lock'))) {
          this.analysis.packageManager = 'yarn';
        } else if (fs.existsSync(path.join(dir, 'package-lock.json'))) {
          this.analysis.packageManager = 'npm';
        }
        
        // Detect frameworks and tools
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        
        if (deps.vue || deps['@vue/cli-service']) {
          this.analysis.framework = 'Vue';
        } else if (deps.react) {
          this.analysis.framework = 'React';
        } else if (deps.svelte) {
          this.analysis.framework = 'Svelte';
        }
        
        if (deps.vite) {
          this.analysis.buildTool = 'Vite';
        } else if (deps.webpack || deps['@vue/cli-service']) {
          this.analysis.buildTool = 'Webpack';
        } else if (deps.rollup) {
          this.analysis.buildTool = 'Rollup';
        }
        
        if (deps.electron) {
          this.analysis.hasElectron = true;
        }
        
        if (deps['@tauri-apps/cli'] || deps['@tauri-apps/api']) {
          this.analysis.hasTauri = true;
        }
        
      } catch (error) {
        console.warn(`⚠️  Error reading package.json at ${pkgPath}: ${error.message}`);
      }
    }
    
    // Fallback package manager detection
    if (!this.analysis.packageManager) {
      this.analysis.packageManager = 'npm'; // Default
    }
  }

  async findPackageFiles(dir, results) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isFile() && entry.name === 'package.json') {
          results.push(fullPath);
        } else if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
          await this.findPackageFiles(fullPath, results);
        }
      }
    } catch (error) {
      console.warn(`⚠️  Error scanning directory ${dir}: ${error.message}`);
    }
  }

  async detectBuildSystem() {
    // Check for common build config files
    const buildConfigs = [
      'vite.config.js', 'vite.config.ts',
      'webpack.config.js', 'webpack.config.ts',
      'rollup.config.js', 'rollup.config.ts',
      'vue.config.js',
      'nuxt.config.js', 'nuxt.config.ts',
      'next.config.js', 'next.config.ts'
    ];
    
    for (const config of buildConfigs) {
      const configPath = path.join(this.sourceDir, config);
      if (fs.existsSync(configPath)) {
        if (config.includes('vite')) {
          this.analysis.buildTool = 'Vite';
        } else if (config.includes('webpack')) {
          this.analysis.buildTool = 'Webpack';
        } else if (config.includes('rollup')) {
          this.analysis.buildTool = 'Rollup';
        } else if (config.includes('vue')) {
          this.analysis.buildTool = 'Vue CLI';
        }
        break;
      }
    }
  }

  async findAppDirectories() {
    const possibleAppDirs = [
      'apps/app',
      'apps/app-frontend', 
      'apps/desktop',
      'packages/app',
      'src',
      'app',
      'client',
      'frontend'
    ];
    
    for (const dir of possibleAppDirs) {
      const fullPath = path.join(this.sourceDir, dir);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
        if (dir.includes('frontend') || dir === 'apps/app-frontend') {
          this.analysis.frontendDirectory = dir;
        }
        if (dir.includes('app') && !this.analysis.appDirectory) {
          this.analysis.appDirectory = dir;
        }
      }
    }
    
    // If no specific app directory found, try to determine from package.json locations
    if (!this.analysis.appDirectory && this.analysis.packageFiles.length > 0) {
      // Look for the main app package.json
      for (const pkgPath of this.analysis.packageFiles) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.main || pkg.scripts?.build || this.analysis.hasElectron || this.analysis.hasTauri) {
          const dir = path.dirname(pkgPath);
          const relativeDir = path.relative(this.sourceDir, dir);
          if (relativeDir && relativeDir !== '.') {
            this.analysis.appDirectory = relativeDir;
            break;
          }
        }
      }
    }
  }

  async detectDesktopFramework() {
    // Check for Tauri config
    const tauriConfig = path.join(this.sourceDir, 'src-tauri', 'tauri.conf.json');
    if (fs.existsSync(tauriConfig)) {
      this.analysis.hasTauri = true;
    }
    
    // Check for Electron main file
    for (const pkgPath of this.analysis.packageFiles) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.main && (pkg.main.includes('electron') || pkg.dependencies?.electron)) {
          this.analysis.hasElectron = true;
        }
      } catch (error) {
        // Ignore
      }
    }
  }

  async determineBuildCommands() {
    const commands = [];
    
    // Determine the correct working directory for builds
    const buildDir = this.analysis.appDirectory || '.';
    
    for (const pkgPath of this.analysis.packageFiles) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const pkgDir = path.relative(this.sourceDir, path.dirname(pkgPath));
        
        if (pkg.scripts) {
          // Common build scripts
          const buildScripts = ['build', 'build:prod', 'build:production', 'compile'];
          const tauriScripts = ['tauri:build', 'build:tauri'];
          const electronScripts = ['electron:build', 'build:electron', 'dist'];
          
          for (const script of buildScripts) {
            if (pkg.scripts[script]) {
              commands.push({
                directory: pkgDir || '.',
                command: `${this.analysis.packageManager} run ${script}`,
                type: 'build'
              });
            }
          }
          
          if (this.analysis.hasTauri) {
            for (const script of tauriScripts) {
              if (pkg.scripts[script]) {
                commands.push({
                  directory: pkgDir || '.',
                  command: `${this.analysis.packageManager} run ${script}`,
                  type: 'tauri-build'
                });
              }
            }
          }
          
          if (this.analysis.hasElectron) {
            for (const script of electronScripts) {
              if (pkg.scripts[script]) {
                commands.push({
                  directory: pkgDir || '.',
                  command: `${this.analysis.packageManager} run ${script}`,
                  type: 'electron-build'
                });
              }
            }
          }
        }
      } catch (error) {
        console.warn(`⚠️  Error reading package.json at ${pkgPath}: ${error.message}`);
      }
    }
    
    this.analysis.buildCommands = commands;
  }
}

// Main execution
async function main() {
  try {
    const sourceDir = process.argv[2];
    if (!sourceDir) {
      console.error('❌ Usage: node analyze-project.js <source-directory>');
      process.exit(1);
    }
    
    const analyzer = new ProjectAnalyzer(sourceDir);
    await analyzer.analyze();
    
    console.log('✅ Project analysis completed successfully');
  } catch (error) {
    console.error('❌ Project analysis failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = ProjectAnalyzer;