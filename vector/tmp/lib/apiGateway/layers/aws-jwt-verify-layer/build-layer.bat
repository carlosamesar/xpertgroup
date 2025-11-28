@echo off
REM Script to build AWS JWT Verify Layer for Lambda on Windows

echo Building AWS JWT Verify Layer...

REM Create temporary directory
if not exist temp\nodejs mkdir temp\nodejs

REM Copy package.json to temp directory  
copy package.json temp\nodejs\

REM Install dependencies in the temp directory
cd temp\nodejs
npm install --production

REM Go back to the original directory
cd ..\..

REM Create the zip file (requires 7-zip or similar)
powershell Compress-Archive -Path temp\* -DestinationPath aws-jwt-verify-layer.zip -Force

REM Clean up
rmdir /s /q temp

echo Layer built successfully: aws-jwt-verify-layer.zip
