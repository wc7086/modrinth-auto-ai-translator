#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Simple debug script to test Vue file extraction
function debugVueExtraction() {
  console.log('🧪 Debugging Vue file extraction...');
  
  // Create test Vue content
  const testVueFiles = [
    {
      name: 'valid.vue',
      content: `<template>
  <div>Hello World</div>
  <button title="Click me">Button</button>
</template>
<script>
export default {
  name: 'TestComponent'
}
</script>`
    },
    {
      name: 'malformed.vue',
      content: `<template>
  <div>Missing end tag
  <button title=">Incomplete attribute
</template>`
    },
    {
      name: 'empty.vue',
      content: ``
    },
    {
      name: 'no-template.vue',
      content: `<script>
export default {
  name: 'NoTemplate'
}
</script>`
    }
  ];
  
  // Test patterns
  const patterns = {
    vue: {
      template: /<template[^>]*>([\s\S]*?)<\/template>/gi
    }
  };
  
  testVueFiles.forEach((file, index) => {
    console.log(`\nTesting file ${index + 1}: ${file.name}`);
    console.log(`Content length: ${file.content.length}`);
    
    try {
      // Test template extraction with exec method
      const regex = new RegExp(patterns.vue.template.source, patterns.vue.template.flags);
      const templateMatch = regex.exec(file.content);
      console.log(`Template match: ${templateMatch ? 'found' : 'not found'}`);
      
      if (templateMatch) {
        console.log(`Match array length: ${templateMatch.length}`);
        console.log(`Full match: "${templateMatch[0] ? templateMatch[0].substring(0, 50) + '...' : 'undefined'}"`);
        console.log(`Capture group [1]: ${templateMatch[1] ? 'exists' : 'undefined'}`);
        
        if (templateMatch[1] !== undefined) {
          const templateContent = templateMatch[1];
          console.log(`Template content length: ${templateContent.length}`);
          console.log(`Template content type: ${typeof templateContent}`);
          console.log(`Template preview: "${templateContent.substring(0, 50)}..."`);
          
          // Test replace operations
          try {
            const cleaned = templateContent
              .replace(/\{\{[^}]+\}\}/g, '')
              .replace(/v-[a-z-]+="[^"]*"/g, '')
              .replace(/@[a-z-]+="[^"]*"/g, '');
            console.log(`Cleaned content: ${cleaned.length} chars`);
          } catch (replaceError) {
            console.error(`Replace error: ${replaceError.message}`);
          }
        } else {
          console.log('Capture group [1] is undefined - regex issue');
        }
      }
      
      // Also test with match method
      const matchResult = file.content.match(patterns.vue.template);
      if (matchResult) {
        console.log(`Match method result: ${matchResult.length} items`);
        console.log(`Match[0]: ${matchResult[0] ? 'exists' : 'undefined'}`);
        console.log(`Match[1]: ${matchResult[1] ? 'exists' : 'undefined'}`);
      }
      
    } catch (error) {
      console.error(`Processing error: ${error.message}`);
      console.error(`Stack: ${error.stack}`);
    }
  });
}

// Main execution
function main() {
  try {
    debugVueExtraction();
    console.log('\n✅ Debug completed');
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { debugVueExtraction };