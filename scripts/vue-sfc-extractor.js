#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { parse: parseSFC } = require('@vue/compiler-sfc');
const { parse: babelParse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;

class VueSFCExtractor {
  constructor(sourceDir) {
    this.sourceDir = sourceDir;
    this.extractedTexts = [];
    this.processedFiles = 0;
    
    // Technical terms and patterns to exclude
    this.technicalTerms = new Set([
      'API', 'HTTP', 'HTTPS', 'JSON', 'XML', 'HTML', 'CSS', 'JS', 'TS',
      'Vue', 'React', 'Node', 'npm', 'yarn', 'pnpm', 'webpack', 'vite',
      'GitHub', 'Git', 'OAuth', 'JWT', 'UUID', 'URL', 'URI', 'SQL',
      'CORS', 'REST', 'GraphQL', 'WebSocket', 'localStorage', 'sessionStorage',
      'getElementById', 'querySelector', 'addEventListener', 'fetch', 'async', 'await',
      'true', 'false', 'null', 'undefined', 'NaN', 'Infinity',
      'floating-vue', 'vue-router', 'vue-virtual-scroller', 'vue-multiselect',
      'modrinth', 'tauri', 'pinia'
    ]);
    
    this.excludePatterns = [
      /^https?:\/\//,          // URLs
      /^\/[\/\w\-\.]*$/,       // File paths  
      /^\.[\/\w\-]*$/,         // Relative paths starting with .
      /^@[\/\w\-]*$/,          // Import paths starting with @
      /^[A-Z_]{2,}$/,          // Constants (all caps)
      /^\d+(\.\d+)*$/,         // Version numbers
      /^[A-Za-z0-9+/=]+$/,     // Base64-like strings
      /^#[0-9a-fA-F]{3,8}$/,   // Hex colors
      /^rgb\(|rgba\(|hsl\(/,   // CSS colors
      /^\$[a-zA-Z]/,           // CSS variables
      /^var\(|calc\(|url\(/,   // CSS functions
      /console\.|error|warn|info|debug|log/i, // Console methods
      /^[a-z]+:[a-z]+$/,       // Key-value pairs like "type:button"
      /^[A-Z][a-zA-Z]*Error$/, // Error types
      /^[a-z]+-[a-z-]+$/,      // Package names (kebab-case)
      /^\?[a-zA-Z]/,           // URL parameters
      /^\w+\(\)$/,             // Function calls
      /^\w+\.\w+/,             // Property access
      /^[a-zA-Z0-9_-]+\.(vue|js|ts|css|scss|png|jpg|svg)$/i, // File references
      /^\{\{.*\}\}$/,          // Vue template expressions
      /^v-[a-z]/,              // Vue directives
      /^[a-z][a-zA-Z]*[A-Z]/,  // camelCase identifiers
      /^[A-Z][a-z]*$/          // PascalCase single words (likely component names)
    ];
  }

  async extractTexts() {
    console.log(`🔍 Starting Vue SFC text extraction from: ${this.sourceDir}`);
    
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
        
        // Skip configuration files
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
          continue;
        }
        
        if (ext === '.vue') {
          await this.processVueFile(fullPath);
        } else if (['.js', '.ts', '.jsx', '.tsx'].includes(ext)) {
          await this.processJSFile(fullPath);
        }
      }
    }
  }

  async processVueFile(filePath) {
    try {
      console.log(`📄 Processing Vue file: ${path.relative(this.sourceDir, filePath)}`);
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(this.sourceDir, filePath);
      
      // Parse Vue SFC
      const { descriptor } = parseSFC(content, { filename: filePath });
      
      // Extract from template
      if (descriptor.template) {
        this.extractFromTemplate(descriptor.template.content, relativePath);
      }
      
      // Extract from script
      if (descriptor.script) {
        this.extractFromScript(descriptor.script.content, relativePath);
      }
      
      // Extract from script setup
      if (descriptor.scriptSetup) {
        this.extractFromScript(descriptor.scriptSetup.content, relativePath);
      }
      
      this.processedFiles++;
    } catch (error) {
      console.warn(`   ⚠️  Error processing Vue file ${filePath}: ${error.message}`);
    }
  }

  extractFromTemplate(templateContent, filePath) {
    if (!templateContent) return;
    
    // Extract text content between tags (excluding Vue expressions)
    const textMatches = templateContent.match(/>([^<>{}]+)</g);
    if (textMatches) {
      textMatches.forEach(match => {
        const text = match.slice(1, -1).trim();
        if (this.isTranslatableText(text)) {
          this.addText(text, filePath, 'template-text');
        }
      });
    }
    
    // Extract attribute values (placeholders, titles, etc.)
    const attrRegex = /(title|placeholder|alt|aria-label|data-tooltip)\s*=\s*"([^"]+)"/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(templateContent)) !== null) {
      const attrValue = attrMatch[2];
      if (this.isTranslatableText(attrValue)) {
        this.addText(attrValue, filePath, `attribute-${attrMatch[1]}`);
      }
    }
    
    // Extract hardcoded strings in Vue expressions (be more careful)
    const vueExprRegex = /\{\{\s*([^}]+)\s*\}\}/g;
    let exprMatch;
    while ((exprMatch = vueExprRegex.exec(templateContent)) !== null) {
      const expr = exprMatch[1].trim();
      // Only extract simple string literals, not complex expressions
      const stringMatch = expr.match(/^['"]([^'"]+)['"]$/);
      if (stringMatch) {
        const text = stringMatch[1];
        if (this.isTranslatableText(text)) {
          this.addText(text, filePath, 'template-expression');
        }
      }
    }
  }

  extractFromScript(scriptContent, filePath) {
    if (!scriptContent) return;
    
    try {
      // Parse JavaScript/TypeScript with Babel
      const ast = babelParse(scriptContent, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx', 'decorators-legacy']
      });
      
      traverse(ast, {
        StringLiteral: (path) => {
          const text = path.node.value;
          if (this.isTranslatableText(text)) {
            // Additional check: avoid importing paths and technical strings
            const parent = path.parent;
            
            // Skip import statements
            if (parent && parent.type === 'ImportDeclaration') {
              return;
            }
            
            // Skip object keys that look technical
            if (parent && parent.type === 'ObjectProperty' && path.node === parent.key) {
              return;
            }
            
            // Skip if it looks like a function/method name
            if (parent && parent.type === 'CallExpression' && path.node === parent.callee) {
              return;
            }
            
            this.addText(text, filePath, 'script-string');
          }
        },
        TemplateLiteral: (path) => {
          // Extract from template literals, but be careful about expressions
          path.node.quasis.forEach(quasi => {
            const text = quasi.value.cooked || quasi.value.raw;
            if (text && this.isTranslatableText(text)) {
              this.addText(text, filePath, 'script-template');
            }
          });
        }
      });
    } catch (error) {
      console.warn(`   ⚠️  Error parsing script in ${filePath}: ${error.message}`);
      // Fallback to regex-based extraction
      this.extractFromScriptRegex(scriptContent, filePath);
    }
  }

  extractFromScriptRegex(scriptContent, filePath) {
    // Fallback regex-based extraction for when AST parsing fails
    const stringRegex = /['"`]([^'"`\n\r]{4,}?)['"`]/g;
    let match;
    
    while ((match = stringRegex.exec(scriptContent)) !== null) {
      const text = match[1];
      if (this.isTranslatableText(text)) {
        this.addText(text, filePath, 'script-regex');
      }
    }
  }

  async processJSFile(filePath) {
    try {
      console.log(`📄 Processing JS file: ${path.relative(this.sourceDir, filePath)}`);
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(this.sourceDir, filePath);
      
      this.extractFromScript(content, relativePath);
      this.processedFiles++;
    } catch (error) {
      console.warn(`   ⚠️  Error processing JS file ${filePath}: ${error.message}`);
    }
  }

  isTranslatableText(text) {
    if (!text || typeof text !== 'string') {
      return false;
    }
    
    text = text.trim();
    
    // Must be at least 2 characters and contain at least one letter
    if (text.length < 2 || !/[a-zA-Z]/.test(text)) {
      return false;
    }
    
    // Check exclude patterns
    for (const pattern of this.excludePatterns) {
      if (pattern.test(text)) {
        return false;
      }
    }
    
    // Check technical terms
    if (this.technicalTerms.has(text.toLowerCase())) {
      return false;
    }
    
    // Skip if mostly numbers or symbols
    const alphaCount = (text.match(/[a-zA-Z]/g) || []).length;
    if (alphaCount / text.length < 0.3) {
      return false;
    }
    
    // Skip single words that are likely technical (unless they contain spaces)
    if (!text.includes(' ') && text.length < 15) {
      // Skip camelCase, PascalCase, or technical-looking single words
      if (/^[a-z]+([A-Z][a-z]*)+$/.test(text) || // camelCase
          /^[A-Z][a-z]*([A-Z][a-z]*)*$/.test(text) || // PascalCase
          /^[a-z]+[-_][a-z]+/.test(text)) { // kebab-case or snake_case
        return false;
      }
    }
    
    return true;
  }

  addText(text, filePath, context) {
    if (!text || typeof text !== 'string') {
      return;
    }
    
    text = text.trim();
    if (!text) return;
    
    this.extractedTexts.push({
      text,
      file: filePath,
      context,
      line: 1 // We could track line numbers if needed
    });
  }

  removeDuplicates() {
    const seen = new Map();
    const unique = [];
    
    for (const item of this.extractedTexts) {
      const key = item.text;
      if (seen.has(key)) {
        // Merge file references
        const existing = seen.get(key);
        if (!existing.files) {
          existing.files = [existing.file];
          delete existing.file;
        }
        if (!existing.files.includes(item.file)) {
          existing.files.push(item.file);
        }
      } else {
        const newItem = { ...item };
        seen.set(key, newItem);
        unique.push(newItem);
      }
    }
    
    return unique.sort((a, b) => a.text.localeCompare(b.text));
  }
}

// Main execution
async function main() {
  const sourceDir = process.argv[2];
  
  if (!sourceDir) {
    console.error('Usage: node vue-sfc-extractor.js <source-directory>');
    process.exit(1);
  }
  
  try {
    const extractor = new VueSFCExtractor(sourceDir);
    const texts = await extractor.extractTexts();
    
    console.log(`✅ Text extraction completed successfully`);
    console.log(`📝 Found ${texts.length} unique translatable texts`);
    
    // Show some examples
    if (texts.length > 0) {
      console.log(`\n📋 Sample extracted texts:`);
      texts.slice(0, 10).forEach((item, index) => {
        console.log(`   ${index + 1}. "${item.text}" (${item.context})`);
      });
      
      if (texts.length > 10) {
        console.log(`   ... and ${texts.length - 10} more`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error during extraction:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = VueSFCExtractor;