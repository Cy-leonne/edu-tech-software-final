import re, os, sys

src = '/home/user/uploads/repomix-output.xml'
data = open(src, encoding='utf-8').read()

pat = re.compile(r'<file path="([^"]+)">')
matches = list(pat.finditer(data))

STRUCT2 = 3034192  # start of the second (older) directory_structure block
ROOT = '/home/user'

seen = set()
written = 0
skipped = 0
for i, m in enumerate(matches):
    path = m.group(1)
    if m.start() >= STRUCT2:
        # older embedded snapshot (edu-tech-softawre-final/*) — ignore
        continue
    if path == 'uploads/repomix-output.xml':
        skipped += 1
        continue
    content_start = m.end()
    close = data.find('