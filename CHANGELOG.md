# Changelog

All notable changes to this project will be documented in this file.

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