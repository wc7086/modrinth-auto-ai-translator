#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Test the text replacement logic with edge cases
function testReplacementLogic() {
  console.log('🧪 Testing text replacement logic...');
  
  // Create test translation mapping
  const testMapping = {
    'Hello World': '你好世界',
    'Settings': '设置',
    'Cancel': '取消',
    'OK': '确定',
    'Error': '错误',
    '': '', // Empty string test
    undefined: '测试', // Undefined test
    null: '测试' // Null test
  };
  
  // Test with various edge cases
  const testCases = [
    { original: 'Hello World', translated: '你好世界' },
    { original: '', translated: '' },
    { original: undefined, translated: '测试' },
    { original: null, translated: '测试' },
    { original: 'Settings', translated: undefined },
    { original: 'Cancel', translated: null }
  ];
  
  console.log('Testing replacement validation...');
  
  testCases.forEach((testCase, index) => {
    try {
      // Test validation logic
      const isValid = testCase.original && testCase.translated && 
                     typeof testCase.original === 'string' && 
                     typeof testCase.translated === 'string' &&
                     testCase.original.trim().length > 0 && 
                     testCase.translated.trim().length > 0 &&
                     testCase.original !== testCase.translated;
      
      console.log(`Test ${index + 1}: ${testCase.original} -> ${testCase.translated} = ${isValid ? 'VALID' : 'INVALID'}`);
      
      if (isValid) {
        // Test regex creation
        const escapedText = testCase.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedText, 'g');
        console.log(`  Regex created successfully: ${regex}`);
      }
      
    } catch (error) {
      console.error(`Test ${index + 1} failed: ${error.message}`);
    }
  });
  
  console.log('✅ Test completed');
}

// Test file processing logic
function testFileProcessing() {
  console.log('🧪 Testing file processing edge cases...');
  
  // Test with various content types
  const testContents = [
    '// Vue component\n<template><div>Hello World</div></template>',
    '/* JavaScript */\nconst message = "Hello World";\nconsole.log(message);',
    '// TypeScript\ninterface Config {\n  title: "Settings";\n}',
    '// Empty file\n',
    '// Special characters\nconst regex = /[.*+?^${}()|[\\]\\\\]/g;'
  ];
  
  testContents.forEach((content, index) => {
    try {
      console.log(`Testing content ${index + 1}:`, content.substring(0, 50) + '...');
      
      // Test that content can be processed without errors
      if (typeof content === 'string') {
        const regex = /Hello World/g;
        const matches = [...content.matchAll(regex)];
        console.log(`  Found ${matches.length} matches`);
      }
      
    } catch (error) {
      console.error(`Content test ${index + 1} failed: ${error.message}`);
    }
  });
  
  console.log('✅ File processing test completed');
}

// Main execution
function main() {
  try {
    testReplacementLogic();
    testFileProcessing();
    
    console.log('🎉 All tests completed successfully');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { testReplacementLogic, testFileProcessing };