#!/bin/bash

# Script to build AWS JWT Verify Layer for Lambda
echo "Building AWS JWT Verify Layer..."

# Create temporary directory
mkdir -p temp/nodejs

# Copy package.json to temp directory
cp package.json temp/nodejs/

# Install dependencies in the temp directory
cd temp/nodejs
npm install --production

# Go back to the original directory
cd ../..

# Create the zip file
zip -r aws-jwt-verify-layer.zip temp/

# Clean up
rm -rf temp/

echo "Layer built successfully: aws-jwt-verify-layer.zip"
