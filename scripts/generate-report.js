#!/usr/bin/env node

const { generateReport } = require('./create-release.js');

// Simple wrapper script for report generation
generateReport().catch(error => {
  console.error('❌ Report generation failed:', error.message);
  process.exit(1);
});