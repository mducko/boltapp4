#!/bin/bash

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")

# Get new version based on bump type
NEW_VERSION=$(npx semver -i "${1:-patch}" $CURRENT_VERSION)

# Update package.json
pnpm version $NEW_VERSION --no-git-tag-version

# Update Android version
VERSION_CODE=$(($(date +%s)/86400))
sed -i "s/versionCode [0-9]*/versionCode $VERSION_CODE/" android/app/build.gradle
sed -i "s/versionName \".*\"/versionName \"$NEW_VERSION\"/" android/app/build.gradle

echo "Version bumped from $CURRENT_VERSION to $NEW_VERSION"