#!/usr/bin/env node

const { installDependencies } = require('./multi-platform-build.js');

// Simple wrapper script for dependency installation
installDependencies().catch(error => {
  console.error('❌ Dependency installation failed:', error.message);
  process.exit(1);
});