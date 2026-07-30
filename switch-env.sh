#!/bin/bash
# Switch the extension AND the landing pages between local dev and production
# in one shot — edits the SNAG_IS_LIVE flag in both config.js files.
#
# Usage:
#   ./switch-env.sh live
#   ./switch-env.sh local

set -e

MODE="$1"
if [ "$MODE" == "live" ]; then
  VALUE=true
elif [ "$MODE" == "local" ]; then
  VALUE=false
else
  echo "Usage: ./switch-env.sh live|local"
  exit 1
fi

cd "$(dirname "$0")"

sed -i '' "s/const SNAG_IS_LIVE = .*/const SNAG_IS_LIVE = $VALUE;/" extension/options/modules/config.js
sed -i '' "s/const SNAG_IS_LIVE = .*/const SNAG_IS_LIVE = $VALUE;/" landing/config.js

echo "Switched to $MODE (SNAG_IS_LIVE = $VALUE) in:"
echo "  - extension/options/modules/config.js"
echo "  - landing/config.js"
echo ""
echo "Next steps:"
echo "  1. Reload the extension in chrome://extensions"
echo "  2. Refresh any open landing page tabs"
