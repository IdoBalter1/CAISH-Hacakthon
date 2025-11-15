#!/bin/bash
# Generate PNG icons from SVG for iOS
# Requires: sips (macOS) or ImageMagick

SVG_FILE="icon.svg"
SIZES=(180 120 152 167)

# For iOS, we need PNG files
# This script uses sips (macOS built-in) to convert SVG to PNG
# Note: sips doesn't directly support SVG, so you may need to:
# 1. Open the SVG in a browser and export as PNG
# 2. Or use a tool like Inkscape: inkscape icon.svg --export-filename=icon-180.png -w 180 -h 180

echo "To generate iOS icons, you can:"
echo "1. Open icon.svg in a design tool (Figma, Sketch, etc.)"
echo "2. Export as PNG in these sizes: 180x180, 120x120, 152x152, 167x167"
echo "3. Place them in the ios/App/App/Assets.xcassets/AppIcon.appiconset/ folder"
echo ""
echo "Or use online tools like:"
echo "- https://realfavicongenerator.net/"
echo "- https://www.appicon.co/"

