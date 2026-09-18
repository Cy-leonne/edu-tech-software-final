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
    close = data.find('</file>', content_start)
    if close == -1:
        print('WARN no close for', path); continue
    content = data[content_start:close]
    # last occurrence wins across any accidental dupes within block-0
    key = path
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w', encoding='utf-8') as f:
        f.write(content)
    written += 1

print('written', written, 'skipped', skipped)
