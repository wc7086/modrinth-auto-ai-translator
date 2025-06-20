#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class TextReplacer {
  constructor(sourceDir) {
    this.sourceDir = sourceDir;
    this.replacements = new Map();
    this.processedFiles = [];
    this.totalReplacements = 0;
    this.backupDir = `${sourceDir}-backup`;
    this.reportData = {
      startTime: new Date().toISOString(),
      sourceDir,
      filesProcessed: 0,
      totalReplacements: 0,
      fileChanges: []
    };
  }

  async replaceTexts() {
    console.log(`🔄 Starting text replacement in: ${this.sourceDir}`);
    
    // Load translation mapping
    await this.loadTranslationMapping();
    
    if (this.replacements.size === 0) {
      console.log('ℹ️  No translations to replace');
      return;
    }
    
    console.log(`📝 Loaded ${this.replacements.size} translation mappings`);
    
    // Create backup if it doesn't exist
    await this.createBackup();
    
    // Process files
    await this.processDirectory(this.sourceDir);
    
    // Generate report
    await this.generateReport();
    
    console.log(`✅ Text replacement completed:`);
    console.log(`   - Files processed: ${this.reportData.filesProcessed}`);
    console.log(`   - Total replacements: ${this.reportData.totalReplacements}`);
    console.log(`   - Files changed: ${this.reportData.fileChanges.length}`);
  }

  async loadTranslationMapping() {
    const mappingPath = path.join(process.cwd(), 'translation-mapping.json');
    
    if (!fs.existsSync(mappingPath)) {
      throw new Error('translation-mapping.json not found. Run translate-text.js first.');
    }
    
    const mappingData = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
    
    // Convert to Map for efficient lookups
    Object.entries(mappingData).forEach(([original, translated]) => {
      this.replacements.set(original, translated);
    });
  }

  async createBackup() {
    if (!fs.existsSync(this.backupDir)) {
      console.log(`💾 Creating backup at: ${this.backupDir}`);
      
      // Create backup directory structure
      await this.copyDirectory(this.sourceDir, this.backupDir);
      
      console.log(`✅ Backup created successfully`);
    } else {
      console.log(`ℹ️  Backup already exists at: ${this.backupDir}`);
    }
  }

  async copyDirectory(src, dest) {
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    fs.mkdirSync(dest, { recursive: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
          await this.copyDirectory(srcPath, destPath);
        }
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  async processDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip common directories that don't contain source files
        if (!['node_modules', '.git', 'dist', 'build', '.nuxt', '.next'].includes(entry.name)) {
          await this.processDirectory(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (['.vue', '.js', '.ts', '.jsx', '.tsx'].includes(ext)) {
          await this.processFile(fullPath);
        }
      }
    }
  }

  async processFile(filePath) {
    try {
      const originalContent = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(this.sourceDir, filePath);
      
      console.log(`📄 Processing: ${relativePath}`);
      this.reportData.filesProcessed++;
      
      let modifiedContent = originalContent;
      let fileReplacements = 0;
      const changes = [];
      
      // Perform replacements
      for (const [original, translated] of this.replacements) {
        const regex = this.createReplacementRegex(original);
        const matches = [...modifiedContent.matchAll(regex)];
        
        if (matches.length > 0) {
          modifiedContent = modifiedContent.replace(regex, (match, ...groups) => {
            // Preserve the context around the text
            return match.replace(original, translated);
          });
          
          fileReplacements += matches.length;
          changes.push({
            original,
            translated,
            occurrences: matches.length,
            contexts: matches.map(m => ({
              match: m[0],
              index: m.index
            }))
          });
        }
      }
      
      // Write modified content if changes were made
      if (fileReplacements > 0) {
        fs.writeFileSync(filePath, modifiedContent, 'utf8');
        
        this.reportData.fileChanges.push({
          file: relativePath,
          replacements: fileReplacements,
          changes
        });
        
        this.totalReplacements += fileReplacements;
        console.log(`   ✓ ${fileReplacements} replacements made`);
      }
      
    } catch (error) {
      console.warn(`⚠️  Error processing ${filePath}: ${error.message}`);
    }
  }

  createReplacementRegex(text) {
    // Escape special regex characters
    const escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Create regex that matches the text in various contexts
    // This handles common patterns like:
    // - "text" (quoted strings)
    // - >text< (between HTML tags)
    // - text within template literals
    
    const patterns = [
      // Quoted strings (single, double, backticks)
      `(['"\`])${escapedText}\\1`,
      // HTML content between tags
      `(>)${escapedText}(<)`,
      // Template literals with interpolation
      `(\\$\\{[^}]*\\s+)${escapedText}([^}]*\\})`,
      // Attribute values
      `(=\\s*['"])${escapedText}(['"])`,
      // Simple text (as fallback)
      `\\b${escapedText}\\b`
    ];
    
    // Use a more specific pattern that preserves context
    return new RegExp(
      `(['"\`>]?)${escapedText}(['"\`<]?)`,
      'g'
    );
  }

  async generateReport() {
    this.reportData.endTime = new Date().toISOString();
    this.reportData.totalReplacements = this.totalReplacements;
    
    const reportPath = path.join(process.cwd(), 'replacement-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.reportData, null, 2));
    
    console.log(`📋 Replacement report saved to: ${reportPath}`);
    
    // Generate summary report
    const summaryPath = path.join(process.cwd(), 'replacement-summary.md');
    const summaryContent = this.generateSummaryMarkdown();
    fs.writeFileSync(summaryPath, summaryContent);
    
    console.log(`📄 Summary report saved to: ${summaryPath}`);
  }

  generateSummaryMarkdown() {
    const duration = new Date(this.reportData.endTime) - new Date(this.reportData.startTime);
    const durationStr = `${Math.round(duration / 1000)}s`;
    
    let summary = `# Text Replacement Summary\n\n`;
    summary += `**Date:** ${new Date(this.reportData.startTime).toLocaleString()}\n`;
    summary += `**Duration:** ${durationStr}\n`;
    summary += `**Source Directory:** ${this.reportData.sourceDir}\n\n`;
    
    summary += `## Statistics\n\n`;
    summary += `- **Files Processed:** ${this.reportData.filesProcessed}\n`;
    summary += `- **Files Changed:** ${this.reportData.fileChanges.length}\n`;
    summary += `- **Total Replacements:** ${this.reportData.totalReplacements}\n`;
    summary += `- **Translation Mappings:** ${this.replacements.size}\n\n`;
    
    if (this.reportData.fileChanges.length > 0) {
      summary += `## Changed Files\n\n`;
      
      for (const fileChange of this.reportData.fileChanges) {
        summary += `### ${fileChange.file}\n\n`;
        summary += `**Replacements:** ${fileChange.replacements}\n\n`;
        
        if (fileChange.changes.length > 0) {
          summary += `**Changes:**\n`;
          for (const change of fileChange.changes) {
            summary += `- \`${change.original}\` → \`${change.translated}\` (${change.occurrences} occurrences)\n`;
          }
          summary += `\n`;
        }
      }
    }
    
    summary += `## Backup\n\n`;
    summary += `A backup of the original files was created at: \`${this.backupDir}\`\n\n`;
    
    summary += `## Restore Instructions\n\n`;
    summary += `To restore the original files if needed:\n`;
    summary += `\`\`\`bash\n`;
    summary += `rm -rf "${this.sourceDir}"\n`;
    summary += `mv "${this.backupDir}" "${this.sourceDir}"\n`;
    summary += `\`\`\`\n`;
    
    return summary;
  }
}

// Main execution
async function main() {
  try {
    const sourceDir = process.argv[2];
    if (!sourceDir) {
      console.error('❌ Usage: node replace-text.js <source-directory>');
      process.exit(1);
    }
    
    const replacer = new TextReplacer(sourceDir);
    await replacer.replaceTexts();
    
    console.log('✅ Text replacement completed successfully');
  } catch (error) {
    console.error('❌ Text replacement failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = TextReplacer;