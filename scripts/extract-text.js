#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class TextExtractor {
  constructor(sourceDir) {
    this.sourceDir = sourceDir;
    this.extractedTexts = [];
    this.processedFiles = 0;
    this.totalFiles = 0;
    
    // Patterns for identifying translatable text
    this.patterns = {
      vue: {
        template: /<template[^>]*>([\s\S]*?)<\/template>/i, // Removed 'g' flag
        scriptString: /['"`]([^'"`\n\r]{3,}?)['"`]/g,
        interpolation: /\{\{([^}]+)\}\}/g
      },
      js: {
        string: /['"`]([^'"`\n\r]{3,}?)['"`]/g,
        jsx: />([^<>{}\n\r]{3,})</g
      }
    };
    
    // Text to exclude from translation
    this.excludePatterns = [
      /^[a-zA-Z0-9_\-\.]+$/,  // Variables/identifiers
      /^https?:\/\//,          // URLs
      /^\/[\/\w\-\.]*$/,       // File paths
      /^[A-Z_]+$/,             // Constants
      /^\d+(\.\d+)*$/,         // Version numbers
      /^[A-Za-z0-9+/=]+$/,     // Base64-like strings
      /^#[0-9a-fA-F]{3,8}$/,   // Hex colors
      /^rgb\(|rgba\(|hsl\(/,   // CSS colors
      /^\$[a-zA-Z]/,           // CSS variables
      /^var\(|calc\(|url\(/,   // CSS functions
      /console\.|error|warn|info|debug|log/i, // Console methods
      /^[a-z]+:[a-z]+$/,       // Key-value pairs
      /^[A-Z][a-zA-Z]*Error$/  // Error types
    ];
    
    // Technical terms that shouldn't be translated
    this.technicalTerms = new Set([
      'API', 'HTTP', 'HTTPS', 'JSON', 'XML', 'HTML', 'CSS', 'JS', 'TS',
      'Vue', 'React', 'Node', 'npm', 'yarn', 'pnpm', 'webpack', 'vite',
      'GitHub', 'Git', 'OAuth', 'JWT', 'UUID', 'URL', 'URI', 'SQL',
      'CORS', 'REST', 'GraphQL', 'WebSocket', 'localStorage', 'sessionStorage',
      'getElementById', 'querySelector', 'addEventListener', 'fetch', 'async', 'await',
      'true', 'false', 'null', 'undefined', 'NaN', 'Infinity'
    ]);
  }

  async extractTexts() {
    console.log(`🔍 Starting text extraction from: ${this.sourceDir}`);
    
    if (!fs.existsSync(this.sourceDir)) {
      throw new Error(`Source directory does not exist: ${this.sourceDir}`);
    }

    await this.scanDirectory(this.sourceDir);
    
    console.log(`📊 Extraction complete:`);
    console.log(`   - Files processed: ${this.processedFiles}`);
    console.log(`   - Texts extracted: ${this.extractedTexts.length}`);
    
    // Remove duplicates and sort
    const uniqueTexts = this.removeDuplicates();
    
    // Save results
    const outputPath = path.join(process.cwd(), 'extracted-text.json');
    fs.writeFileSync(outputPath, JSON.stringify({
      metadata: {
        sourceDir: this.sourceDir,
        extractedAt: new Date().toISOString(),
        filesProcessed: this.processedFiles,
        textsFound: uniqueTexts.length
      },
      texts: uniqueTexts
    }, null, 2));
    
    console.log(`✅ Extracted texts saved to: ${outputPath}`);
    return uniqueTexts;
  }

  async scanDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip common directories that don't contain translatable content
        if (!['node_modules', '.git', 'dist', 'build', '.nuxt', '.next'].includes(entry.name)) {
          await this.scanDirectory(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        const filename = entry.name.toLowerCase();
        
        // Skip configuration files that shouldn't be processed
        const skipFiles = [
          'nuxt.config.ts', 'nuxt.config.js',
          'vite.config.ts', 'vite.config.js', 
          'webpack.config.js', 'webpack.config.ts',
          'rollup.config.js', 'rollup.config.ts',
          'tailwind.config.js', 'tailwind.config.ts',
          'tsconfig.json', 'package.json',
          'eslint.config.js', 'eslint.config.ts'
        ];
        
        if (skipFiles.includes(filename)) {
          console.log(`⏭️  Skipping config file: ${entry.name}`);
          return;
        }
        
        if (['.vue', '.js', '.ts', '.jsx', '.tsx'].includes(ext)) {
          await this.processFile(fullPath);
        }
      }
    }
  }

  async processFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(this.sourceDir, filePath);
      const ext = path.extname(filePath).toLowerCase();
      
      console.log(`📄 Processing: ${relativePath}`);
      this.processedFiles++;
      
      if (ext === '.vue') {
        this.extractFromVue(content, relativePath);
      } else if (['.js', '.ts', '.jsx', '.tsx'].includes(ext)) {
        this.extractFromScript(content, relativePath, ext);
      }
    } catch (error) {
      console.warn(`⚠️  Error processing ${filePath}: ${error.message}`);
    }
  }

  extractFromVue(content, filePath) {
    try {
      if (!content || typeof content !== 'string') {
        console.warn(`   ⚠️  Invalid Vue content in ${filePath}`);
        return;
      }
      
      // Extract from template section
      const templateRegex = new RegExp(this.patterns.vue.template.source, this.patterns.vue.template.flags);
      const templateMatch = templateRegex.exec(content);
      if (templateMatch && templateMatch[1]) {
        const templateContent = templateMatch[1];
        this.extractTextFromTemplate(templateContent, filePath);
      }
      
      // Extract from script section
      const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
      if (scriptMatch && scriptMatch[1]) {
        const scriptContent = scriptMatch[1];
        this.extractTextFromScript(scriptContent, filePath);
      }
    } catch (error) {
      console.warn(`   ⚠️  Error in extractFromVue: ${error.message}`);
    }
  }

  extractFromScript(content, filePath, ext) {
    try {
      if (!content || typeof content !== 'string') {
        console.warn(`   ⚠️  Invalid script content in ${filePath}`);
        return;
      }
      
      if (['.jsx', '.tsx'].includes(ext)) {
        this.extractTextFromJSX(content, filePath);
      } else {
        this.extractTextFromScript(content, filePath);
      }
    } catch (error) {
      console.warn(`   ⚠️  Error in extractFromScript: ${error.message}`);
    }
  }

  extractTextFromTemplate(content, filePath) {
    try {
      // Validate input
      if (!content || typeof content !== 'string') {
        console.warn(`   ⚠️  Invalid template content in ${filePath}`);
        return;
      }
      
      // Remove Vue directives and interpolations temporarily
      const cleanContent = content
        .replace(/\{\{[^}]+\}\}/g, '') // Remove interpolations
        .replace(/v-[a-z-]+="[^"]*"/g, '') // Remove Vue directives
        .replace(/@[a-z-]+="[^"]*"/g, ''); // Remove event handlers
      
      // Extract text between HTML tags
      const textMatches = cleanContent.match(/>([^<>{}\n\r]{3,})</g);
      if (textMatches) {
        textMatches.forEach(match => {
          try {
            const text = match.slice(1, -1).trim();
            if (this.isTranslatable(text)) {
              this.addText(text, filePath, 'template');
            }
          } catch (error) {
            console.warn(`   ⚠️  Error processing template match: ${error.message}`);
          }
        });
      }
      
      // Extract text from common attributes
      const attrMatches = content.match(/(title|placeholder|alt|aria-label)="([^"]{3,})"/g);
      if (attrMatches) {
        attrMatches.forEach(match => {
          try {
            const parts = match.split('="');
            if (parts.length >= 2) {
              const text = parts[1].slice(0, -1);
              if (this.isTranslatable(text)) {
                this.addText(text, filePath, 'attribute');
              }
            }
          } catch (error) {
            console.warn(`   ⚠️  Error processing attribute match: ${error.message}`);
          }
        });
      }
    } catch (error) {
      console.warn(`   ⚠️  Error in extractTextFromTemplate: ${error.message}`);
    }
  }

  extractTextFromScript(content, filePath) {
    try {
      if (!content || typeof content !== 'string') {
        console.warn(`   ⚠️  Invalid script content in ${filePath}`);
        return;
      }
      
      const stringMatches = content.match(this.patterns.js.string);
      if (stringMatches) {
        stringMatches.forEach(match => {
          try {
            if (match && match.length >= 2) {
              const text = match.slice(1, -1); // Remove quotes
              if (this.isTranslatable(text)) {
                this.addText(text, filePath, 'string');
              }
            }
          } catch (error) {
            console.warn(`   ⚠️  Error processing script match: ${error.message}`);
          }
        });
      }
    } catch (error) {
      console.warn(`   ⚠️  Error in extractTextFromScript: ${error.message}`);
    }
  }

  extractTextFromJSX(content, filePath) {
    try {
      if (!content || typeof content !== 'string') {
        console.warn(`   ⚠️  Invalid JSX content in ${filePath}`);
        return;
      }
      
      // First extract regular strings
      this.extractTextFromScript(content, filePath);
      
      // Then extract JSX text content
      const jsxMatches = content.match(this.patterns.js.jsx);
      if (jsxMatches) {
        jsxMatches.forEach(match => {
          try {
            if (match && match.length >= 2) {
              const text = match.slice(1, -1).trim();
              if (this.isTranslatable(text)) {
                this.addText(text, filePath, 'jsx');
              }
            }
          } catch (error) {
            console.warn(`   ⚠️  Error processing JSX match: ${error.message}`);
          }
        });
      }
    } catch (error) {
      console.warn(`   ⚠️  Error in extractTextFromJSX: ${error.message}`);
    }
  }

  isTranslatable(text) {
    // Basic length check
    if (text.length < 3 || text.length > 500) {
      return false;
    }
    
    // Check exclude patterns
    for (const pattern of this.excludePatterns) {
      if (pattern.test(text)) {
        return false;
      }
    }
    
    // Check technical terms
    if (this.technicalTerms.has(text.trim())) {
      return false;
    }
    
    // Must contain at least one letter
    if (!/[a-zA-Z]/.test(text)) {
      return false;
    }
    
    // Skip if mostly numbers or symbols
    const alphaCount = (text.match(/[a-zA-Z]/g) || []).length;
    if (alphaCount / text.length < 0.3) {
      return false;
    }
    
    // Skip common code patterns
    const codePatterns = [
      /^\w+\(\)/,              // Function calls
      /^\w+\.\w+/,             // Property access
      /^[a-z]+([A-Z][a-z]*)+$/, // camelCase
      /^[A-Z][A-Z_]*$/,        // CONSTANTS
      /\$\{.*\}/,              // Template literals
      /{.*}/,                  // Object literals
      /\[.*\]/,                // Array literals
    ];
    
    for (const pattern of codePatterns) {
      if (pattern.test(text.trim())) {
        return false;
      }
    }
    
    return true;
  }

  addText(text, filePath, context) {
    try {
      if (!text || typeof text !== 'string') {
        return;
      }
      
      const trimmedText = text.trim();
      if (trimmedText) {
        this.extractedTexts.push({
          text: trimmedText,
          file: filePath,
          context,
          line: this.getLineNumber(text, filePath)
        });
      }
    } catch (error) {
      console.warn(`   ⚠️  Error adding text: ${error.message}`);
    }
  }

  getLineNumber(text, filePath) {
    // This is a simplified line number detection
    // In a real implementation, you'd track line numbers during parsing
    return 1;
  }

  removeDuplicates() {
    const seen = new Map();
    const unique = [];
    
    for (const item of this.extractedTexts) {
      const key = `${item.text}:${item.context}`;
      if (!seen.has(key)) {
        seen.set(key, true);
        unique.push(item);
      } else {
        // Add file reference to existing entry
        const existing = unique.find(u => u.text === item.text && u.context === item.context);
        if (existing && !existing.files) {
          existing.files = [existing.file];
          delete existing.file;
        }
        if (existing && existing.files && !existing.files.includes(item.file)) {
          existing.files.push(item.file);
        }
      }
    }
    
    return unique.sort((a, b) => a.text.localeCompare(b.text));
  }
}

// Main execution
async function main() {
  try {
    const sourceDir = process.argv[2];
    if (!sourceDir) {
      console.error('❌ Usage: node extract-text.js <source-directory>');
      process.exit(1);
    }
    
    const extractor = new TextExtractor(sourceDir);
    await extractor.extractTexts();
    
    console.log('✅ Text extraction completed successfully');
  } catch (error) {
    console.error('❌ Text extraction failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = TextExtractor;