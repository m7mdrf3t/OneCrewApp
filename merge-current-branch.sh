#!/bin/bash

# Script to merge the current branch into all other local branches
# Usage: ./merge-current-branch.sh

set -e  # Exit on error

# Get the current branch name
CURRENT_BRANCH=$(git branch --show-current)

if [ -z "$CURRENT_BRANCH" ]; then
    echo "Error: Not in a git repository or no branch checked out"
    exit 1
fi

echo "Current branch: $CURRENT_BRANCH"
echo "This script will merge $CURRENT_BRANCH into all other local branches."
echo ""

# Check if there are uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "Warning: You have uncommitted changes. Please commit or stash them first."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Get all local branches except the current one
BRANCHES=$(git branch --format='%(refname:short)' | grep -v "^$CURRENT_BRANCH$")

if [ -z "$BRANCHES" ]; then
    echo "No other branches found to merge into."
    exit 0
fi

echo "Branches to merge into:"
echo "$BRANCHES" | sed 's/^/  - /'
echo ""

read -p "Proceed with merging? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

# Store the original branch
ORIGINAL_BRANCH=$CURRENT_BRANCH

# Track success and failures
SUCCESS_COUNT=0
FAILED_BRANCHES=()

# Merge into each branch
for BRANCH in $BRANCHES; do
    echo ""
    echo "=========================================="
    echo "Merging $ORIGINAL_BRANCH into $BRANCH..."
    echo "=========================================="
    
    # Checkout the target branch
    if ! git checkout "$BRANCH" 2>/dev/null; then
        echo "Error: Failed to checkout branch $BRANCH. Skipping..."
        FAILED_BRANCHES+=("$BRANCH")
        continue
    fi
    
    # Merge the original branch
    if git merge "$ORIGINAL_BRANCH" --no-edit; then
        echo "✓ Successfully merged $ORIGINAL_BRANCH into $BRANCH"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo "✗ Failed to merge $ORIGINAL_BRANCH into $BRANCH"
        FAILED_BRANCHES+=("$BRANCH")
        
        # Check if there are merge conflicts
        if [ -n "$(git ls-files -u)" ]; then
            echo "  Conflict detected! Resolve conflicts and commit manually."
            read -p "  Continue with other branches? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                echo "Stopping merge process. Returning to $ORIGINAL_BRANCH..."
                git checkout "$ORIGINAL_BRANCH"
                exit 1
            fi
        fi
    fi
done

# Return to the original branch
echo ""
echo "Returning to original branch: $ORIGINAL_BRANCH"
git checkout "$ORIGINAL_BRANCH"

# Summary
echo ""
echo "=========================================="
echo "Merge Summary"
echo "=========================================="
echo "Successfully merged into: $SUCCESS_COUNT branch(es)"

if [ ${#FAILED_BRANCHES[@]} -gt 0 ]; then
    echo "Failed branches:"
    for BRANCH in "${FAILED_BRANCHES[@]}"; do
        echo "  - $BRANCH"
    done
    exit 1
else
    echo "All merges completed successfully!"
    exit 0
fi






