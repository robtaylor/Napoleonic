#!/usr/bin/env bash
# Run after `npx cap add ios` to force landscape-only orientation.
# Idempotent — safe to run multiple times.

PLIST="ios/App/App/Info.plist"

if [ ! -f "$PLIST" ]; then
    echo "Error: $PLIST not found. Run 'npx cap add ios' first."
    exit 1
fi

# Replace iPhone orientations: landscape only
/usr/libexec/PlistBuddy -c "Delete :UISupportedInterfaceOrientations" "$PLIST" 2>/dev/null
/usr/libexec/PlistBuddy -c "Add :UISupportedInterfaceOrientations array" "$PLIST"
/usr/libexec/PlistBuddy -c "Add :UISupportedInterfaceOrientations:0 string UIInterfaceOrientationLandscapeLeft" "$PLIST"
/usr/libexec/PlistBuddy -c "Add :UISupportedInterfaceOrientations:1 string UIInterfaceOrientationLandscapeRight" "$PLIST"

# Replace iPad orientations: landscape only
/usr/libexec/PlistBuddy -c "Delete :UISupportedInterfaceOrientations~ipad" "$PLIST" 2>/dev/null
/usr/libexec/PlistBuddy -c "Add :UISupportedInterfaceOrientations~ipad array" "$PLIST"
/usr/libexec/PlistBuddy -c "Add :UISupportedInterfaceOrientations~ipad:0 string UIInterfaceOrientationLandscapeLeft" "$PLIST"
/usr/libexec/PlistBuddy -c "Add :UISupportedInterfaceOrientations~ipad:1 string UIInterfaceOrientationLandscapeRight" "$PLIST"

echo "Locked iOS to landscape-only orientation."
