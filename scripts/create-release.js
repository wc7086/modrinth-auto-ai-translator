#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ReleaseCreator {
  constructor() {
    this.releaseTag = process.env.RELEASE_TAG;
    this.githubToken = process.env.GITHUB_TOKEN;
    this.model = process.env.OPENAI_MODEL;
    this.targetLanguage = process.env.TARGET_LANGUAGE;
    
    this.buildReport = null;
    this.translationReport = null;
    this.artifacts = [];
    this.releaseNotes = '';
  }

  async createRelease() {
    console.log(`🚀 Starting release creation process`);
    
    // Validate required environment variables
    this.validateEnvironment();
    
    // Load reports
    await this.loadReports();
    
    // Determine release tag
    await this.determineReleaseTag();
    
    // Generate release notes
    await this.generateReleaseNotes();
    
    // Collect artifacts
    await this.collectArtifacts();
    
    // Create GitHub release
    await this.createGitHubRelease();
    
    console.log(`✅ Release created successfully: ${this.releaseTag}`);
  }

  validateEnvironment() {
    if (!this.githubToken) {
      throw new Error('GITHUB_TOKEN environment variable is required');
    }
    
    // Check if gh CLI is available
    try {
      execSync('gh --version', { stdio: 'pipe' });
    } catch (error) {
      throw new Error('GitHub CLI (gh) is not installed or not in PATH');
    }
  }

  async loadReports() {
    console.log(`📋 Loading reports...`);
    
    // Load build report
    const buildReportPath = path.join(process.cwd(), 'build-report.json');
    if (fs.existsSync(buildReportPath)) {
      this.buildReport = JSON.parse(fs.readFileSync(buildReportPath, 'utf8'));
      console.log(`   ✓ Build report loaded`);
    }
    
    // Load translation report
    const translationReportPath = path.join(process.cwd(), 'translations.json');
    if (fs.existsSync(translationReportPath)) {
      this.translationReport = JSON.parse(fs.readFileSync(translationReportPath, 'utf8'));
      console.log(`   ✓ Translation report loaded`);
    }
    
    // Load replacement report
    const replacementReportPath = path.join(process.cwd(), 'replacement-report.json');
    if (fs.existsSync(replacementReportPath)) {
      this.replacementReport = JSON.parse(fs.readFileSync(replacementReportPath, 'utf8'));
      console.log(`   ✓ Replacement report loaded`);
    }
  }

  async determineReleaseTag() {
    if (this.releaseTag && this.releaseTag !== 'latest') {
      console.log(`🏷️  Using provided release tag: ${this.releaseTag}`);
      return;
    }
    
    let sourceTag = null;
    
    try {
      // If user specified 'latest' or no tag provided, get from Modrinth source repo
      if (this.releaseTag === 'latest' || !this.releaseTag) {
        console.log(`🔍 Getting latest tag from Modrinth source repository...`);
        
        // Check if modrinth-source directory exists (from workflow)
        const sourceDir = 'modrinth-source';
        if (fs.existsSync(sourceDir)) {
          // Get latest tag from source repository
          sourceTag = execSync('git describe --tags --abbrev=0', { 
            cwd: sourceDir,
            stdio: 'pipe', 
            encoding: 'utf8' 
          }).trim();
          console.log(`📋 Found source repository tag: ${sourceTag}`);
        } else {
          // Fallback: fetch from remote Modrinth repository
          console.log(`📡 Fetching latest tag from remote Modrinth repository...`);
          sourceTag = await this.getLatestTagFromRemote();
        }
      }
      
      // If we still don't have a source tag, try current repository
      if (!sourceTag) {
        console.log(`🔄 Falling back to current repository tags...`);
        sourceTag = execSync('git describe --tags --abbrev=0', { 
          stdio: 'pipe', 
          encoding: 'utf8' 
        }).trim();
      }
      
      // Create translated version tag
      if (sourceTag) {
        this.releaseTag = `${sourceTag}-zh-cn`;
        console.log(`🏷️  Generated release tag: ${this.releaseTag} (based on ${sourceTag})`);
      } else {
        throw new Error('No tags found');
      }
      
    } catch (error) {
      console.warn(`⚠️  Could not determine source tag: ${error.message}`);
      
      // Create a timestamped tag as fallback
      const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
      this.releaseTag = `v1.0.0-translated-${timestamp}`;
      console.log(`🏷️  Created fallback release tag: ${this.releaseTag}`);
    }
  }
  
  async getLatestTagFromRemote() {
    try {
      // Use git ls-remote to get latest tag from Modrinth repository
      const output = execSync('git ls-remote --tags --sort=-version:refname https://github.com/modrinth/code.git', {
        stdio: 'pipe',
        encoding: 'utf8',
        timeout: 30000 // 30 second timeout
      });
      
      // Parse the output to get the latest tag
      const lines = output.trim().split('\n');
      for (const line of lines) {
        const match = line.match(/refs\/tags\/(.+)$/);
        if (match && !match[1].includes('^{}')) {
          const tag = match[1];
          // Skip pre-release or beta tags
          if (!tag.includes('beta') && !tag.includes('alpha') && !tag.includes('rc')) {
            console.log(`📡 Remote latest tag: ${tag}`);
            return tag;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.warn(`⚠️  Failed to fetch remote tags: ${error.message}`);
      return null;
    }
  }

  async generateReleaseNotes() {
    console.log(`📝 Generating release notes...`);
    
    const currentDate = new Date().toISOString().split('T')[0];
    
    let notes = `# 🌐 Translated Release ${this.releaseTag}\n\n`;
    notes += `**Release Date:** ${currentDate}\n\n`;
    
    // Translation summary
    if (this.translationReport) {
      notes += `## 🔤 Translation Summary\n\n`;
      notes += `- **Target Language:** ${this.targetLanguage}\n`;
      notes += `- **AI Model Used:** ${this.model}\n`;
      notes += `- **Texts Processed:** ${this.translationReport.metadata.totalTexts}\n`;
      notes += `- **Successfully Translated:** ${this.translationReport.metadata.successfulTranslations}\n`;
      
      if (this.translationReport.metadata.failedTranslations > 0) {
        notes += `- **Failed Translations:** ${this.translationReport.metadata.failedTranslations}\n`;
      }
      notes += `\n`;
    }
    
    // Build summary
    if (this.buildReport) {
      notes += `## 🏗️ Build Summary\n\n`;
      
      const successfulBuilds = this.buildReport.builds.filter(b => b.success);
      const failedBuilds = this.buildReport.builds.filter(b => !b.success);
      
      notes += `- **Successful Builds:** ${successfulBuilds.length}\n`;
      if (failedBuilds.length > 0) {
        notes += `- **Failed Builds:** ${failedBuilds.length}\n`;
      }
      notes += `- **Build Artifacts:** ${this.buildReport.artifacts.length}\n\n`;
      
      if (successfulBuilds.length > 0) {
        notes += `### ✅ Successful Builds\n\n`;
        for (const build of successfulBuilds) {
          const duration = build.duration ? ` (${Math.round(build.duration/1000)}s)` : '';
          notes += `- **${build.platform}**${duration}\n`;
        }
        notes += `\n`;
      }
      
      if (failedBuilds.length > 0) {
        notes += `### ❌ Failed Builds\n\n`;
        for (const build of failedBuilds) {
          notes += `- **${build.platform}**: ${build.error}\n`;
        }
        notes += `\n`;
      }
    }
    
    // File changes summary
    if (this.replacementReport) {
      notes += `## 📁 Modified Files\n\n`;
      notes += `- **Files Changed:** ${this.replacementReport.fileChanges.length}\n`;
      notes += `- **Total Replacements:** ${this.replacementReport.totalReplacements}\n\n`;
      
      if (this.replacementReport.fileChanges.length > 0) {
        notes += `### Changed Files:\n\n`;
        for (const fileChange of this.replacementReport.fileChanges.slice(0, 10)) { // Limit to first 10
          notes += `- \`${fileChange.file}\` (${fileChange.replacements} changes)\n`;
        }
        
        if (this.replacementReport.fileChanges.length > 10) {
          notes += `- ... and ${this.replacementReport.fileChanges.length - 10} more files\n`;
        }
        notes += `\n`;
      }
    }
    
    // Installation instructions
    notes += `## 💾 Installation\n\n`;
    notes += `Download the appropriate build for your platform from the assets below.\n\n`;
    
    // Platform-specific instructions
    if (this.buildReport && this.buildReport.artifacts.length > 0) {
      const platforms = [...new Set(this.buildReport.artifacts.map(a => a.platform))];
      
      for (const platform of platforms) {
        const platformArtifacts = this.buildReport.artifacts.filter(a => a.platform === platform);
        
        if (platformArtifacts.length > 0) {
          notes += `### ${this.formatPlatformName(platform)}\n\n`;
          for (const artifact of platformArtifacts) {
            const size = artifact.size ? ` (${Math.round(artifact.size/1024/1024)}MB)` : '';
            notes += `- ${artifact.name}${size}\n`;
          }
          notes += `\n`;
        }
      }
    }
    
    // Technical details
    notes += `## 🔧 Technical Details\n\n`;
    notes += `This release was automatically generated with translated UI text using AI.\n\n`;
    notes += `- **Source Repository:** https://github.com/modrinth/code\n`;
    notes += `- **Translation Model:** ${this.model}\n`;
    notes += `- **Target Language:** ${this.targetLanguage}\n`;
    notes += `- **Build Date:** ${currentDate}\n\n`;
    
    // Disclaimer
    notes += `## ⚠️ Disclaimer\n\n`;
    notes += `This is an automatically translated version of the original software. `;
    notes += `Translation quality may vary, and some technical terms may not be translated appropriately. `;
    notes += `Please refer to the original English version for the most accurate information.\n\n`;
    
    // Generated signature
    notes += `---\n`;
    notes += `🤖 Generated with [Claude Code](https://claude.ai/code)\n`;
    
    this.releaseNotes = notes;
    
    // Save release notes to file
    const notesPath = path.join(process.cwd(), 'release-notes.md');
    fs.writeFileSync(notesPath, notes);
    console.log(`   ✓ Release notes saved to: ${notesPath}`);
  }

  formatPlatformName(platform) {
    const platformNames = {
      'linux-x64': '🐧 Linux (x64)',
      'windows-x64': '🪟 Windows (x64)', 
      'macos-x64': '🍎 macOS (Intel)',
      'macos-arm64': '🍎 macOS (Apple Silicon)',
      'web': '🌐 Web Application'
    };
    
    return platformNames[platform] || platform;
  }

  async collectArtifacts() {
    console.log(`📦 Collecting release artifacts...`);
    
    // Check for build artifacts directory
    const artifactsDir = path.join(process.cwd(), 'build-artifacts');
    if (fs.existsSync(artifactsDir)) {
      const files = fs.readdirSync(artifactsDir);
      
      for (const file of files) {
        const filePath = path.join(artifactsDir, file);
        const stats = fs.statSync(filePath);
        
        this.artifacts.push({
          name: file,
          path: filePath,
          size: stats.size
        });
      }
      
      console.log(`   ✓ Found ${this.artifacts.length} build artifacts`);
    }
    
    // Also include report files as artifacts
    const reportFiles = [
      'build-report.json',
      'translations.json', 
      'replacement-report.json',
      'replacement-summary.md',
      'project-analysis.json',
      'extracted-text.json'
    ];
    
    for (const reportFile of reportFiles) {
      const reportPath = path.join(process.cwd(), reportFile);
      if (fs.existsSync(reportPath)) {
        this.artifacts.push({
          name: reportFile,
          path: reportPath,
          size: fs.statSync(reportPath).size
        });
      }
    }
    
    console.log(`   ✓ Total artifacts: ${this.artifacts.length}`);
  }

  async createGitHubRelease() {
    console.log(`🚀 Creating GitHub release: ${this.releaseTag}`);
    
    try {
      // Create the release with release notes
      const notesPath = path.join(process.cwd(), 'release-notes.md');
      
      let cmd = `gh release create "${this.releaseTag}" --title "🌐 Translated Release ${this.releaseTag}"`;
      
      if (fs.existsSync(notesPath)) {
        cmd += ` --notes-file "${notesPath}"`;
      } else {
        cmd += ` --notes "Automatically translated release"`;
      }
      
      // Add artifacts
      if (this.artifacts.length > 0) {
        const artifactPaths = this.artifacts.map(a => `"${a.path}"`).join(' ');
        cmd += ` ${artifactPaths}`;
      }
      
      console.log(`   Executing: gh release create...`);
      const output = execSync(cmd, { stdio: 'pipe', encoding: 'utf8' });
      
      console.log(`   ✅ Release created successfully`);
      console.log(`   📎 Release URL: ${output.trim()}`);
      
      // Output summary
      this.outputSummary();
      
    } catch (error) {
      console.error(`   ❌ Failed to create release: ${error.message}`);
      
      // Try to provide helpful error information
      if (error.message.includes('already exists')) {
        console.log(`   💡 Tag ${this.releaseTag} already exists. Try with a different tag.`);
      } else if (error.message.includes('authentication')) {
        console.log(`   💡 Check that GITHUB_TOKEN is valid and has the necessary permissions.`);
      }
      
      throw error;
    }
  }

  outputSummary() {
    console.log(`\n📊 Release Summary:`);
    console.log(`   - Release Tag: ${this.releaseTag}`);
    console.log(`   - Artifacts: ${this.artifacts.length}`);
    
    if (this.translationReport) {
      console.log(`   - Translations: ${this.translationReport.metadata.successfulTranslations}/${this.translationReport.metadata.totalTexts}`);
    }
    
    if (this.buildReport) {
      const successful = this.buildReport.builds.filter(b => b.success).length;
      console.log(`   - Successful Builds: ${successful}/${this.buildReport.builds.length}`);
    }
    
    console.log(`   - Target Language: ${this.targetLanguage}`);
    console.log(`   - AI Model: ${this.model}`);
  }
}

// Generate report script
async function generateReport() {
  console.log(`📋 Generating final summary report...`);
  
  const reports = {};
  
  // Load all available reports
  const reportFiles = [
    'project-analysis.json',
    'extracted-text.json',
    'translations.json',
    'replacement-report.json',
    'build-report.json'
  ];
  
  for (const file of reportFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      try {
        reports[file] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (error) {
        console.warn(`⚠️  Could not load ${file}: ${error.message}`);
      }
    }
  }
  
  // Generate comprehensive summary
  const summary = {
    generatedAt: new Date().toISOString(),
    workflow: {
      model: process.env.OPENAI_MODEL,
      targetLanguage: process.env.TARGET_LANGUAGE,
      dryRun: process.env.DRY_RUN === 'true'
    },
    reports
  };
  
  const summaryPath = path.join(process.cwd(), 'workflow-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  
  console.log(`✅ Workflow summary saved to: ${summaryPath}`);
}

// Main execution
async function main() {
  try {
    const releaseCreator = new ReleaseCreator();
    await releaseCreator.createRelease();
    
    console.log('✅ Release creation completed successfully');
  } catch (error) {
    console.error('❌ Release creation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { ReleaseCreator, generateReport };