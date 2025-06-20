# Changelog

All notable changes to this project will be documented in this file.

## [1.4.0] - 2024-12-20

### Added
- 🚀 **Immediate Cache Saving**: Cache is saved immediately after translation completion
- 📦 **Early Artifact Upload**: Translation artifacts uploaded right after translation step
- 🛡️ **Failure-Resistant Caching**: Preserves translation work even if subsequent steps fail
- 🔄 **Optimized Workflow**: Separated translation and build artifacts with different retention policies

### Enhanced
- ⚡ **Improved Resilience**: Build failures no longer cause loss of translation cache
- 💰 **Better Cost Control**: Expensive translations are preserved regardless of build outcome
- 📊 **Artifact Organization**: Clear separation between translation (30 days) and build (7 days) artifacts
- 🔧 **Development Efficiency**: Faster iteration cycles with preserved translation state

### Technical Improvements
- Cache saving moved from end of workflow to immediately after translation
- Translation artifacts uploaded with `if: always()` condition
- Enhanced cache key strategy with run ID for better isolation
- Optimized artifact retention policies based on importance and usage patterns

## [1.3.0] - 2024-12-20

### Added
- 💾 **Smart Translation Caching**: Intelligent caching system to avoid redundant API calls
- 🔄 **GitHub Actions Cache Integration**: Automatic cache restoration and persistence across workflow runs
- 📊 **Cache Performance Metrics**: Detailed statistics on cache hits, API calls, and cost savings
- 🎯 **Model-Specific Caching**: Separate cache entries for different models and target languages
- 🧪 **Cache Testing Suite**: Comprehensive tests for cache functionality and performance

### Enhanced
- 🚀 **Performance Optimization**: Dramatically reduced translation time and API costs through caching
- 📈 **Cost Efficiency**: Potential 50-90% reduction in OpenAI API costs for repeated workflows
- ⚡ **Speed Improvements**: Cached translations are retrieved instantly without API delays

### Technical Features
- Cache key includes text, model, target language, and context for precise matching
- Automatic cache invalidation for different model/language combinations
- Fallback handling when cache is corrupted or outdated
- Integration with GitHub Actions cache for persistent storage across runs

## [1.2.0] - 2024-12-20

### Added
- 🏷️ **Smart Release Tagging**: Automatically fetch latest tag from Modrinth source repository
- 📡 **Remote Tag Detection**: Support for `latest` release tag option
- 🔄 **Fallback Logic**: Multiple strategies for tag determination (local → remote → fallback)
- 🧪 **Tag Logic Testing**: Test script for validating tag determination logic

### Fixed  
- 🐛 **Vue Template Extraction**: Fixed regex global flag issue preventing capture group access
- 🔧 **Release Tag Logic**: Now properly uses Modrinth source repository tags when `latest` specified
- 📋 **Default Behavior**: Set `latest` as default release tag for better user experience

### Changed
- 🏷️ **Tag Format**: Generated tags now use format `{source-tag}-zh-cn` (e.g., `v0.9.5-zh-cn`)
- ⚙️ **Workflow Input**: Release tag now defaults to `latest` instead of empty
- 📝 **Documentation**: Updated parameter descriptions and usage examples

## [1.1.0] - 2024-12-20

### Fixed
- 🐛 **Text Replacement Error**: Fixed `Cannot read properties of undefined (reading 'replace')` error in `replace-text.js`
- 🔒 **Data Validation**: Added comprehensive validation for translation mapping data
- 🛡️ **Error Handling**: Improved error handling and logging in file processing
- 🧪 **Regex Safety**: Enhanced regex creation with proper error handling

### Added
- ✅ **Test Script**: Added `test-replacement.js` for validating replacement logic
- 📊 **Better Logging**: Enhanced debugging information for troubleshooting
- 🔍 **Edge Case Handling**: Improved handling of undefined, null, and empty values
- 📝 **Debug Documentation**: Added troubleshooting section to README

### Changed
- 🚀 **Replacement Logic**: Simplified text replacement algorithm for better reliability
- 🎯 **Validation**: Stricter validation for original and translated text pairs
- 💪 **Robustness**: More resilient handling of malformed translation data

### Technical Details
- Fixed undefined property access in regex replacement callbacks
- Added null/undefined checks for translation mapping entries
- Implemented safer regex creation with try-catch blocks
- Enhanced file processing with individual replacement error handling

## [1.0.0] - 2024-12-20

### Added
- 🚀 **Initial Release**: Complete GitHub Actions workflow for auto-translation
- 🤖 **AI Translation**: OpenAI API integration with multiple model support
- 📝 **Text Extraction**: Smart extraction from Vue/React/TypeScript files
- 🔄 **Text Replacement**: Automated replacement preserving code structure
- 🏗️ **Multi-Platform Build**: Support for Tauri, Electron, and web applications
- 📦 **Release Automation**: Automatic GitHub release creation with artifacts
- 📊 **Comprehensive Reporting**: Detailed logs and reports for all operations

### Features
- Manual workflow trigger with configurable parameters
- Smart text filtering to avoid translating technical terms
- Backup creation before making changes
- Support for custom OpenAI API endpoints
- Multi-language support (default: Simplified Chinese)
- Dry-run mode for testing
- Automatic version tagging

### Supported Platforms
- Linux x64
- Windows x64
- macOS x64 (Intel)
- macOS ARM64 (Apple Silicon)
- Web applications