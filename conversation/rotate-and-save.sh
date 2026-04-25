#!/bin/bash
# Rotate conversation logs and save new message
# Usage: ./rotate-and-save.sh "message content"

cd "$(dirname "$0")"

# Delete oldest if it exists
[ -f "10.conv" ] && rm "10.conv"

# Rotate existing files (9->10, 8->9, ..., 1->2)
for i in {9..1}; do
    if [ -f "$i.conv" ]; then
        mv "$i.conv" "$((i+1)).conv"
    fi
done

# Save new message as 1.conv
echo "$1" > 1.conv

echo "Message saved. Current logs:"
ls -1 *.conv 2>/dev/null | sort -V

# Made with Bob
