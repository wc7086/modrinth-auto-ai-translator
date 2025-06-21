#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class AITranslator {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.apiEndpoint = process.env.API_ENDPOINT || 'https://api.openai.com/v1';
    this.targetLanguage = process.env.TARGET_LANGUAGE || '简体中文';
    
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    this.translations = new Map();
    this.translationBatches = [];
    this.processedCount = 0;
    this.totalCount = 0;
    this.cacheHits = 0;
    this.apiCalls = 0;
    
    // Cache configuration
    this.cacheFile = path.join(process.cwd(), 'translation-cache.json');
    this.cache = new Map();
    
    // Load existing cache
    this.loadCache();
  }

  loadCache() {
    try {
      if (fs.existsSync(this.cacheFile)) {
        const cacheData = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
        
        // Validate cache structure
        if (cacheData.version && cacheData.cache && typeof cacheData.cache === 'object') {
          // Load cache entries with model and language matching
          Object.entries(cacheData.cache).forEach(([key, entry]) => {
            // Only load cache entries that match current model and target language
            if (entry.model === this.model && entry.targetLanguage === this.targetLanguage) {
              this.cache.set(key, entry);
            }
          });
          
          console.log(`📋 Loaded ${this.cache.size} cached translations (model: ${this.model}, language: ${this.targetLanguage})`);
        } else {
          console.log(`🔄 Cache file format outdated, starting fresh`);
        }
      } else {
        console.log(`📝 No translation cache found, starting fresh`);
      }
    } catch (error) {
      console.warn(`⚠️  Error loading cache: ${error.message}`);
      this.cache.clear();
    }
  }

  saveCache() {
    try {
      // Load existing cache file to preserve other model/language combinations
      let existingCache = {};
      if (fs.existsSync(this.cacheFile)) {
        try {
          const cacheData = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
          if (cacheData.cache) {
            existingCache = cacheData.cache;
          }
        } catch (error) {
          console.warn(`⚠️  Error reading existing cache: ${error.message}`);
        }
      }
      
      // Add current cache entries
      this.cache.forEach((entry, key) => {
        existingCache[key] = entry;
      });
      
      const cacheData = {
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        cache: existingCache
      };
      
      fs.writeFileSync(this.cacheFile, JSON.stringify(cacheData, null, 2));
      console.log(`💾 Translation cache saved: ${this.cache.size} entries`);
    } catch (error) {
      console.warn(`⚠️  Error saving cache: ${error.message}`);
    }
  }

  getCacheKey(text, context = '') {
    // Create a cache key that includes text, model, target language, and context
    return `${text}|${this.model}|${this.targetLanguage}|${context}`;
  }

  getCachedTranslation(text, context = '') {
    const key = this.getCacheKey(text, context);
    const cached = this.cache.get(key);
    
    if (cached && cached.translated) {
      this.cacheHits++;
      return cached.translated;
    }
    
    return null;
  }

  setCachedTranslation(text, translated, context = '') {
    const key = this.getCacheKey(text, context);
    this.cache.set(key, {
      original: text,
      translated,
      context,
      model: this.model,
      targetLanguage: this.targetLanguage,
      createdAt: new Date().toISOString()
    });
  }

  async translateTexts() {
    console.log(`🤖 Starting AI translation with ${this.model}`);
    console.log(`🎯 Target language: ${this.targetLanguage}`);
    
    // Load extracted texts
    const extractedPath = path.join(process.cwd(), 'extracted-text.json');
    if (!fs.existsSync(extractedPath)) {
      throw new Error('extracted-text.json not found. Run extract-text.js first.');
    }
    
    const extractedData = JSON.parse(fs.readFileSync(extractedPath, 'utf8'));
    const texts = extractedData.texts || [];
    
    if (texts.length === 0) {
      console.log('ℹ️  No texts found to translate');
      return;
    }
    
    console.log(`📝 Found ${texts.length} texts to translate`);
    this.totalCount = texts.length;
    
    // Check cache for existing translations
    const { cachedTexts, uncachedTexts } = this.separateCachedTexts(texts);
    
    console.log(`📋 Cache status:`);
    console.log(`   - Cached: ${cachedTexts.length} texts`);
    console.log(`   - Need translation: ${uncachedTexts.length} texts`);
    
    // Process cached texts
    cachedTexts.forEach(text => {
      const cached = this.getCachedTranslation(text.text, text.context);
      this.translations.set(text.text, {
        original: text.text,
        translated: cached,
        context: text.context,
        files: text.files || [text.file],
        fromCache: true
      });
      this.processedCount++;
    });
    
    // Only translate uncached texts
    if (uncachedTexts.length > 0) {
      // Group uncached texts into batches for efficient translation
      const batches = this.createBatches(uncachedTexts, 10); // 10 texts per batch
      
      console.log(`📦 Created ${batches.length} translation batches for uncached texts`);
      
      // Translate each batch
      for (let i = 0; i < batches.length; i++) {
        console.log(`🔄 Processing batch ${i + 1}/${batches.length}...`);
        await this.translateBatch(batches[i], i);
        
        // Add delay to respect rate limits
        if (i < batches.length - 1) {
          await this.delay(1000); // 1 second delay between batches
        }
      }
    } else {
      console.log(`🎉 All texts found in cache, no API calls needed!`);
    }
    
    // Save updated cache
    this.saveCache();
    
    // Save translations
    await this.saveTranslations(extractedData);
    
    console.log(`✅ Translation completed: ${this.processedCount}/${this.totalCount} texts`);
    console.log(`📊 Cache efficiency: ${this.cacheHits}/${this.totalCount} hits (${Math.round(this.cacheHits/this.totalCount*100)}%)`);
    console.log(`🔌 API calls made: ${this.apiCalls}`);
  }

  separateCachedTexts(texts) {
    const cachedTexts = [];
    const uncachedTexts = [];
    
    texts.forEach(text => {
      const cached = this.getCachedTranslation(text.text, text.context);
      if (cached) {
        cachedTexts.push(text);
      } else {
        uncachedTexts.push(text);
      }
    });
    
    return { cachedTexts, uncachedTexts };
  }

  createBatches(texts, batchSize) {
    const batches = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      batches.push(texts.slice(i, i + batchSize));
    }
    return batches;
  }

  async translateBatch(batch, batchIndex) {
    const prompt = this.createBatchPrompt(batch);
    
    try {
      const response = await this.callOpenAI(prompt);
      this.apiCalls++; // Count API call
      const translations = this.parseBatchResponse(response, batch);
      
      // Store translations and cache them
      for (let i = 0; i < batch.length; i++) {
        const originalText = batch[i];
        const translatedText = translations[i] || originalText.text; // Fallback to original
        
        // Save to cache
        this.setCachedTranslation(originalText.text, translatedText, originalText.context);
        
        // Store in current translations
        this.translations.set(originalText.text, {
          original: originalText.text,
          translated: translatedText,
          context: originalText.context,
          files: originalText.files || [originalText.file],
          fromCache: false
        });
        
        this.processedCount++;
      }
      
      console.log(`   ✓ Batch ${batchIndex + 1} completed (${batch.length} texts)`);
      
    } catch (error) {
      console.error(`   ❌ Batch ${batchIndex + 1} failed: ${error.message}`);
      
      // Fallback: try individual translations for this batch
      await this.translateBatchIndividually(batch);
    }
  }

  async translateBatchIndividually(batch) {
    console.log(`   🔄 Retrying batch individually...`);
    
    for (const text of batch) {
      try {
        // Check cache first
        let translated = this.getCachedTranslation(text.text, text.context);
        let fromCache = true;
        
        if (!translated) {
          translated = await this.translateSingle(text.text);
          this.apiCalls++; // Count API call
          fromCache = false;
          
          // Save to cache
          this.setCachedTranslation(text.text, translated, text.context);
        }
        
        this.translations.set(text.text, {
          original: text.text,
          translated,
          context: text.context,
          files: text.files || [text.file],
          fromCache
        });
        this.processedCount++;
        
        // Delay between individual requests (only for API calls)
        if (!fromCache) {
          await this.delay(500);
        }
        
      } catch (error) {
        console.warn(`   ⚠️  Failed to translate: "${text.text.substring(0, 50)}..."`);
        
        // Store original text as fallback
        this.translations.set(text.text, {
          original: text.text,
          translated: text.text,
          context: text.context,
          files: text.files || [text.file],
          error: true,
          fromCache: false
        });
        this.processedCount++;
      }
    }
  }

  createBatchPrompt(batch) {
    const textList = batch.map((item, index) => 
      `${index + 1}. "${item.text}"`
    ).join('\n');
    
    return `You are a professional software localization expert. Translate the following UI text strings from English to ${this.targetLanguage}.

CRITICAL INSTRUCTIONS - READ CAREFULLY:
- ONLY translate genuine user interface text (buttons, messages, labels, tooltips)
- DO NOT translate if the text appears to be:
  * Package names (e.g., "floating-vue", "vue-router")
  * File paths or URLs (e.g., "./component.vue", "https://...")
  * Function names or variables (e.g., "onClick", "userData")
  * CSS classes or IDs (e.g., "btn-primary", "#app")
  * Technical identifiers or code snippets
  * Import statements or module names
  * Configuration keys or API endpoints
- Preserve placeholders, variables, and special formatting (like {}, [], etc.)
- Keep technical terms and proper nouns in English when appropriate
- Make translations natural and user-friendly for ${this.targetLanguage} speakers
- If uncertain whether text is UI-related, DO NOT translate it - return original text

WHEN IN DOUBT: If text looks technical or code-related, keep it unchanged!

Context: These are extracted from a Vue.js desktop application. Only user-facing text should be translated.

Text strings to translate:
${textList}

Please respond with ONLY the translated strings in the same numbered format. Use original text if unsure:
1. [translated text 1]
2. [translated text 2]
...

Do not include any explanation or additional text.`;
  }

  async translateSingle(text) {
    const prompt = `Translate this UI text from English to ${this.targetLanguage}. 

CRITICAL: Only translate if this is genuine user interface text (buttons, messages, labels). 
DO NOT translate if it looks like: package names, file paths, function names, CSS classes, or any technical identifiers.
WHEN IN DOUBT: Return the original text unchanged.

Text: "${text}"

Translation:`;

    const response = await this.callOpenAI(prompt);
    return response.trim().replace(/^["']|["']$/g, ''); // Remove surrounding quotes
  }

  async callOpenAI(prompt) {
    const response = await fetch(`${this.apiEndpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a professional software localization expert. Provide accurate, contextual translations for UI strings.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }
    
    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('No translation received from API');
    }
    
    return data.choices[0].message.content;
  }

  parseBatchResponse(response, originalBatch) {
    const lines = response.split('\n').filter(line => line.trim());
    const translations = [];
    
    for (const line of lines) {
      // Match numbered format: "1. translated text"
      const match = line.match(/^\d+\.\s*(.+)$/);
      if (match) {
        translations.push(match[1].trim().replace(/^["']|["']$/g, ''));
      }
    }
    
    // Ensure we have the same number of translations as original texts
    while (translations.length < originalBatch.length) {
      const missingIndex = translations.length;
      translations.push(originalBatch[missingIndex].text); // Fallback to original
    }
    
    return translations;
  }

  async saveTranslations(originalData) {
    const translationData = {
      metadata: {
        ...originalData.metadata,
        translatedAt: new Date().toISOString(),
        model: this.model,
        targetLanguage: this.targetLanguage,
        apiEndpoint: this.apiEndpoint,
        totalTexts: this.totalCount,
        successfulTranslations: this.processedCount,
        failedTranslations: this.totalCount - this.processedCount
      },
      translations: Array.from(this.translations.values())
    };
    
    const outputPath = path.join(process.cwd(), 'translations.json');
    fs.writeFileSync(outputPath, JSON.stringify(translationData, null, 2));
    
    console.log(`💾 Translations saved to: ${outputPath}`);
    
    // Also create a simple mapping file for replacement script
    const mappingData = {};
    this.translations.forEach((value, key) => {
      if (value.translated !== value.original) {
        mappingData[key] = value.translated;
      }
    });
    
    const mappingPath = path.join(process.cwd(), 'translation-mapping.json');
    fs.writeFileSync(mappingPath, JSON.stringify(mappingData, null, 2));
    
    console.log(`🗺️  Translation mapping saved to: ${mappingPath}`);
    
    // Generate summary
    const changed = Object.keys(mappingData).length;
    const unchanged = this.translations.size - changed;
    
    console.log(`📊 Translation Summary:`);
    console.log(`   - Total processed: ${this.processedCount}`);
    console.log(`   - Translated: ${changed}`);
    console.log(`   - Unchanged: ${unchanged}`);
    console.log(`   - Model used: ${this.model}`);
    console.log(`   - Target language: ${this.targetLanguage}`);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
async function main() {
  try {
    const translator = new AITranslator();
    await translator.translateTexts();
    
    console.log('✅ AI translation completed successfully');
  } catch (error) {
    console.error('❌ AI translation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = AITranslator;