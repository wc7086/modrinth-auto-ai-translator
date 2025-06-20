# Modrinth Auto Translator

Automatically translate and build Modrinth applications with AI-powered translation.

## Overview

This project provides a comprehensive GitHub Actions workflow that:

1. **Pulls source code** from the Modrinth repository
2. **Extracts translatable text** from Vue/React/TypeScript files  
3. **Translates text** using OpenAI API
4. **Replaces hardcoded text** in source files
5. **Builds multi-platform executables** (Windows, macOS, Linux)
6. **Creates GitHub releases** with translated builds

## Features

- 🤖 **AI-Powered Translation** - Uses OpenAI GPT models for contextual translation
- 🔍 **Smart Text Detection** - Intelligently identifies UI text while avoiding code elements
- 🌐 **Multi-Platform Builds** - Supports Tauri, Electron, and web applications
- 📊 **Detailed Reporting** - Comprehensive logs and reports for each step
- 🛡️ **Safe Operations** - Creates backups before making changes
- ⚙️ **Configurable** - Supports custom API endpoints, models, and languages

## Quick Start

1. **Set up secrets** in your GitHub repository:
   - `OPENAI_API_KEY` - Your OpenAI API key

2. **Run the workflow**:
   - Go to Actions → "Auto Translate and Release"
   - Click "Run workflow"
   - Select your preferred options:
     - OpenAI model (gpt-4o-mini default, supports any OpenAI model)
     - Target language (default: 简体中文)
     - API endpoint (optional custom endpoint)
     - Release tag (optional, auto-generated if empty)
     - Dry run (for testing without building/releasing)

## Workflow Configuration

### Input Parameters

| Parameter | Description | Default | Required |
|-----------|-------------|---------|----------|
| `openai_model` | OpenAI model to use | `gpt-4o-mini` | Yes |
| `api_endpoint` | API endpoint URL | `https://api.openai.com/v1` | No |
| `target_language` | Target language for translation | `简体中文` | No |
| `release_tag` | Release tag to use | Auto-generated | No |
| `dry_run` | Only analyze and translate, don't build | `false` | No |

### Required Secrets

- `OPENAI_API_KEY` - Your OpenAI API key with sufficient credits
- `GITHUB_TOKEN` - Automatically provided by GitHub Actions

## How It Works

### 1. Project Analysis
- Detects project type (monorepo, single package)
- Identifies build tools (Vite, Webpack, etc.)
- Determines package manager (npm, yarn, pnpm)
- Locates app and frontend directories

### 2. Text Extraction
- Scans `apps/app-frontend` directory specifically
- Extracts text from `.vue`, `.js`, `.ts`, `.jsx`, `.tsx` files
- Intelligently filters out:
  - Technical terms and identifiers
  - URLs and file paths
  - Code keywords and constants
  - Console logs and error messages

### 3. AI Translation
- Processes text in batches for efficiency
- Provides context to ensure accurate translation
- Preserves formatting and special characters
- Handles rate limiting and error recovery

### 4. Text Replacement
- Creates backup before making changes
- Preserves code structure and indentation
- Maintains variable interpolation and templates
- Tracks all changes for reporting

### 5. Multi-Platform Building
- Auto-detects Tauri or Electron applications
- Builds for multiple platforms:
  - Linux x64
  - Windows x64  
  - macOS x64 and ARM64
- Collects build artifacts automatically

### 6. Release Creation
- Generates comprehensive release notes
- Uploads all build artifacts
- Includes translation and build statistics
- Creates professional release documentation

## File Structure

```
.github/workflows/
  translate-and-release.yml    # Main workflow file

scripts/
  analyze-project.js           # Project structure analysis
  extract-text.js             # Text extraction from source files
  translate-text.js           # AI translation using OpenAI
  replace-text.js             # Text replacement in source files
  multi-platform-build.js     # Multi-platform build automation
  install-deps.js             # Dependency installation helper
  create-release.js           # GitHub release creation
  generate-report.js          # Final report generation
```

## Generated Artifacts

The workflow produces several artifacts:

### Reports
- `project-analysis.json` - Project structure analysis
- `extracted-text.json` - All extracted translatable text
- `translations.json` - AI translation results
- `replacement-report.json` - File modification details
- `build-report.json` - Build process results
- `workflow-summary.json` - Complete workflow summary

### Build Artifacts
- Platform-specific executables (Windows `.exe`, macOS `.app`, Linux binaries)
- Web application archives (if applicable)
- Installation packages (`.dmg`, `.deb`, `.rpm`, etc.)

## Customization

### Adding New File Types
Edit `scripts/extract-text.js` to add support for additional file extensions.

### Custom Translation Logic
Modify `scripts/translate-text.js` to adjust translation prompts or add custom filtering.

### Build Configuration
Update `scripts/multi-platform-build.js` to support additional build tools or platforms.

### Translation Quality
The system excludes common technical terms and code elements. To customize this behavior, edit the exclusion patterns in `extract-text.js`.

## Troubleshooting

### Common Issues

1. **OpenAI API Errors**
   - Check API key validity and credits
   - Verify rate limits aren't exceeded
   - Ensure custom endpoint is accessible

2. **Build Failures**
   - Check that source project builds successfully
   - Verify all dependencies are available
   - Review build logs in the workflow output

3. **Text Extraction Issues**
   - Ensure `apps/app-frontend` directory exists
   - Check file extensions are supported
   - Review extraction patterns for your project

4. **Text Replacement Errors**
   - `Cannot read properties of undefined (reading 'replace')` - Fixed in v1.1
   - Translation mapping contains invalid data - Check `translation-mapping.json` format
   - Regex errors with special characters - Use test script to validate

### Debugging Commands

```bash
# Test text replacement logic
node scripts/test-replacement.js

# Run in dry-run mode to test without changes
# Set dry_run: true in workflow inputs

# Check translation mapping validity
cat translation-mapping.json | jq 'to_entries | map(select(.value != null and .value != ""))'
```

### Debug Mode
Set `dry_run: true` to test the translation process without building or releasing.

## Limitations

- Only processes text in `apps/app-frontend` directory
- Requires OpenAI API access with sufficient credits
- Build success depends on source project configuration
- Translation quality depends on AI model capabilities

## License

This project is provided as-is for educational and development purposes. Please respect the original Modrinth project's license terms.

## Contributing

Feel free to submit issues and improvements to enhance the translation accuracy and build process.