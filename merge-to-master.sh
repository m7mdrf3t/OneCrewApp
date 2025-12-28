#!/bin/bash

# Script to merge the current branch into master
# Usage: ./merge-to-master.sh [--push] [--no-pull]

set -e  # Exit on error

# Parse arguments
PUSH_AFTER_MERGE=false
PULL_BEFORE_MERGE=true

while [[ $# -gt 0 ]]; do
    case $1 in
        --push)
            PUSH_AFTER_MERGE=true
            shift
            ;;
        --no-pull)
            PULL_BEFORE_MERGE=false
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--push] [--no-pull]"
            exit 1
            ;;
    esac
done

# Get the current branch name
CURRENT_BRANCH=$(git branch --show-current)

if [ -z "$CURRENT_BRANCH" ]; then
    echo "❌ Error: Not in a git repository or no branch checked out"
    exit 1
fi

# Check if already on master
if [ "$CURRENT_BRANCH" = "master" ]; then
    echo "⚠️  You are already on the master branch."
    echo "   This script merges the current branch INTO master."
    echo "   Please checkout a different branch first."
    exit 1
fi

echo "📋 Current branch: $CURRENT_BRANCH"
echo "🎯 Target branch: master"
echo ""

# Check if there are uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  Warning: You have uncommitted changes."
    echo ""
    git status --short
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
fi

# Check if master branch exists
if ! git show-ref --verify --quiet refs/heads/master; then
    echo "❌ Error: master branch does not exist locally."
    echo "   Do you want to create it from origin/master? (y/N)"
    read -p "   " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if git show-ref --verify --quiet refs/remotes/origin/master; then
            git checkout -b master origin/master
        else
            echo "❌ Error: origin/master does not exist either."
            exit 1
        fi
    else
        exit 1
    fi
fi

# Store the original branch
ORIGINAL_BRANCH=$CURRENT_BRANCH

echo "🔄 Switching to master branch..."
git checkout master

# Pull latest changes from origin/master if requested
if [ "$PULL_BEFORE_MERGE" = true ]; then
    if git show-ref --verify --quiet refs/remotes/origin/master; then
        echo "⬇️  Pulling latest changes from origin/master..."
        if ! git pull origin master; then
            echo "⚠️  Warning: Failed to pull from origin/master. Continuing with local merge..."
        fi
    else
        echo "ℹ️  No remote master branch found. Skipping pull."
    fi
fi

echo ""
echo "🔀 Merging $ORIGINAL_BRANCH into master..."
echo ""

# Attempt the merge
if git merge "$ORIGINAL_BRANCH" --no-edit; then
    echo ""
    echo "✅ Successfully merged $ORIGINAL_BRANCH into master!"
    
    # Push to remote if requested
    if [ "$PUSH_AFTER_MERGE" = true ]; then
        if git show-ref --verify --quiet refs/remotes/origin/master; then
            echo ""
            read -p "Push to origin/master? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                echo "⬆️  Pushing to origin/master..."
                if git push origin master; then
                    echo "✅ Successfully pushed to origin/master!"
                else
                    echo "❌ Failed to push to origin/master."
                    exit 1
                fi
            fi
        else
            echo "ℹ️  No remote master branch found. Skipping push."
        fi
    fi
    
    # Ask if user wants to return to original branch
    echo ""
    read -p "Return to $ORIGINAL_BRANCH? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        echo "🔄 Returning to $ORIGINAL_BRANCH..."
        git checkout "$ORIGINAL_BRANCH"
    fi
    
    echo ""
    echo "✨ Merge completed successfully!"
    exit 0
else
    echo ""
    echo "❌ Merge failed!"
    
    # Check if there are merge conflicts
    if [ -n "$(git ls-files -u)" ]; then
        echo ""
        echo "⚠️  Merge conflicts detected!"
        echo "   Please resolve the conflicts and commit manually:"
        echo ""
        echo "   git status                    # See conflicted files"
        echo "   # Edit files to resolve conflicts"
        echo "   git add <resolved-files>"
        echo "   git commit"
        echo ""
        echo "   Or abort the merge:"
        echo "   git merge --abort"
    fi
    
    # Ask if user wants to return to original branch
    read -p "Return to $ORIGINAL_BRANCH? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        echo "🔄 Returning to $ORIGINAL_BRANCH..."
        git checkout "$ORIGINAL_BRANCH"
    fi
    
    exit 1
fi



