#!/usr/bin/env python3
"""Extract all files from the repomix packed output into the workspace."""
import os
import re
import sys

SRC = "/home/user/uploads/repomix-output.xml"
DEST = "/home/user"

with open(SRC, "r", encoding="utf-8", newline="") as f:
    data = f.read()

# Only consider the region inside the first <files> ... </files>
start = data.index("<files>")
end = data.rindex("</files>")
region = data[start:end]

pattern = re.compile(r'<file path="([^"]+)">\n?(.*?)</file>', re.DOTALL)

count = 0
skipped = []
paths = []
for m in pattern.finditer(region):
    path = m.group(1)
    content = m.group(2)
    # Normalize Windows line endings
    content = content.replace("\r\n", "\n")
    # Remove a single trailing newline that came from formatting? Keep as-is.
    full = os.path.join(DEST, path)
    # Safety: only write under DEST
    if not os.path.abspath(full).startswith(os.path.abspath(DEST) + os.sep):
        skipped.append(path)
        continue
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8", newline="\n") as out:
        out.write(content)
    count += 1
    paths.append(path)

print(f"Extracted {count} files")
if skipped:
    print("Skipped (unsafe):", skipped)
# Duplicate check
from collections import Counter
dups = [p for p, c in Counter(paths).items() if c > 1]
if dups:
    print("Duplicate paths in archive:", dups)
