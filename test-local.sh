#!/bin/bash

# 本地测试脚本 - 使用act运行GitHub Actions工作流

set -e

echo "🧪 Starting local GitHub Actions testing with act..."

# 检查act是否安装
if ! command -v act &> /dev/null; then
    echo "❌ act is not installed. Please install it first:"
    echo "   https://github.com/nektos/act"
    exit 1
fi

echo "✅ act is available"

# 检查Docker是否运行
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "✅ Docker is running"

# 创建临时的secrets文件
SECRETS_FILE=$(mktemp)
cat > "$SECRETS_FILE" << EOF
OPENAI_API_KEY=sk-test-dummy-key-for-local-testing
GITHUB_TOKEN=ghp_test-dummy-token-for-local-testing
EOF

echo "📝 Created temporary secrets file: $SECRETS_FILE"

# 测试选项
echo ""
echo "🎯 Available test options:"
echo "1. Test only translate job (fast)"
echo "2. Test linux build job only"  
echo "3. Test full workflow (slow)"
echo "4. Test with dry run mode"
echo ""
read -p "Select option (1-4): " choice

case $choice in
    1)
        echo "🚀 Testing translate job only..."
        act workflow_dispatch \
            --workflows .github/workflows/translate-and-release.yml \
            --job translate \
            --secret-file "$SECRETS_FILE" \
            --input openai_model="gpt-4o-mini" \
            --input target_language="简体中文" \
            --input dry_run="true" \
            --verbose
        ;;
    2)
        echo "🚀 Testing linux build job only..."
        # 首先运行translate作业
        echo "Step 1: Running translate job..."
        act workflow_dispatch \
            --workflows .github/workflows/translate-and-release.yml \
            --job translate \
            --secret-file "$SECRETS_FILE" \
            --input openai_model="gpt-4o-mini" \
            --input target_language="简体中文" \
            --input dry_run="false" \
            --verbose
        
        echo "Step 2: Running linux build job..."
        act workflow_dispatch \
            --workflows .github/workflows/translate-and-release.yml \
            --job build-platforms \
            --matrix platform:linux \
            --secret-file "$SECRETS_FILE" \
            --verbose
        ;;
    3)
        echo "🚀 Testing full workflow..."
        echo "⚠️  This will take a long time and require significant resources"
        read -p "Are you sure? (y/N): " confirm
        if [[ $confirm =~ ^[Yy]$ ]]; then
            act workflow_dispatch \
                --workflows .github/workflows/translate-and-release.yml \
                --secret-file "$SECRETS_FILE" \
                --input openai_model="gpt-4o-mini" \
                --input target_language="简体中文" \
                --input dry_run="false" \
                --verbose
        else
            echo "❌ Cancelled"
            exit 0
        fi
        ;;
    4)
        echo "🚀 Testing with dry run mode..."
        act workflow_dispatch \
            --workflows .github/workflows/translate-and-release.yml \
            --secret-file "$SECRETS_FILE" \
            --input openai_model="gpt-4o-mini" \
            --input target_language="简体中文" \
            --input dry_run="true" \
            --verbose
        ;;
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac

# 清理
echo ""
echo "🧹 Cleaning up..."
rm -f "$SECRETS_FILE"

echo "✅ Local test completed!"
echo ""
echo "💡 Useful act commands:"
echo "   act --list                     # List all available jobs"
echo "   act --dry-run                  # Show what would be executed"
echo "   act --verbose                  # Show verbose output"
echo "   act --reuse                    # Reuse containers between runs"
echo "   act --platform ubuntu-latest=node:16-buster-slim  # Use smaller image"