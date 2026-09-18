#!/usr/bin/env python3
"""Centralize the frontend API base URL into src/utils/apiConfig.js.

Replaces the duplicated resolution logic
    const X = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';
(and close variants) with a single import of API_BASE_URL from apiConfig.
"""
import os
import re
import sys

ROOT = '/home/user/frontend/src'
CONFIG_MODULE = 'utils/apiConfig'

# Patterns for the "definition" line we want to remove / alias.
BASE_EXPR = r"process\.env\.REACT_APP_BASE_URL\s*\|\|\s*'http://localhost:5000'"
BASE_EXPR_ALT = r"process\.env\.REACT_APP_BASE_URL\s*\|\|\s*process\.env\.REACT_APP_API_URL\s*\|\|\s*'http://localhost:5000'"

def rel_import(from_file):
    d = os.path.dirname(from_file)
    # d like /home/user/frontend/src/pages/admin
    rel = os.path.relpath(os.path.join(ROOT, CONFIG_MODULE), d)
    if not rel.startswith('.'):
        rel = './' + rel
    return rel

def process_file(path):
    relpath = os.path.relpath(path, '/home/user/frontend')
    changed = False
    with open(path, encoding='utf-8') as f:
        src = f.read()

    orig = src

    # Skip apiConfig itself and its tests
    if relpath in ('src/utils/apiConfig.js', 'src/utils/apiConfig.test.js'):
        return False

    needs_import = False

    # 1) module / component / function scope const definitions
    #    const NAME = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';
    def repl_def(m):
        nonlocal needs_import
        name = m.group(1)
        indent = m.group(2)
        needs_import = True
        return f"{indent}const {name} = API_BASE_URL;"

    src, n1 = re.subn(
        r"([ \t]*)const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*" + BASE_EXPR + r"\s*;",
        repl_def, src)
    src, n2 = re.subn(
        r"([ \t]*)const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*" + BASE_EXPR_ALT + r"\s*;",
        repl_def, src)

    # 2) MessageHistory style: const REACT_APP_BASE_URL = process.env.REACT_APP_BASE_URL;
    src, n3 = re.subn(
        r"([ \t]*)const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*process\.env\.REACT_APP_BASE_URL\s*;",
        repl_def, src)

    # 3) inline template usages: ${process.env.REACT_APP_BASE_URL || 'http://localhost:5000'}
    src, n4 = re.subn(
        r"\$\{" + BASE_EXPR + r"\}",
        '${API_BASE_URL}', src)
    src, n5 = re.subn(
        r"\$\{" + BASE_EXPR_ALT + r"\}",
        '${API_BASE_URL}', src)

    # 4) anything else directly referencing the hardcoded fallback with env
    src, n6 = re.subn(
        r"process\.env\.REACT_APP_BASE_URL\s*\|\|\s*'http://localhost:5000'",
        'API_BASE_URL', src)
    src, n7 = re.subn(
        r"process\.env\.REACT_APP_BASE_URL\s*\|\|\s*process\.env\.REACT_APP_API_URL\s*\|\|\s*'http://localhost:5000'",
        'API_BASE_URL', src)

    if n1 + n2 + n3 + n4 + n5 + n6 + n7 > 0:
        needs_import = True

    # Insert import if needed and not already present
    if needs_import:
        if re.search(r"from ['\"][^'\"]*utils/apiConfig['\"]", src):
            needs_import = False
        else:
            imp = f"import {{ API_BASE_URL }} from '{rel_import(path)}';\n"
            # place after the last import line, else at top
            lines = src.split('\n')
            last_import_idx = -1
            for i, line in enumerate(lines):
                if re.match(r"\s*import\s+", line) or re.match(r"\s*const .*=\s*require\(", line):
                    last_import_idx = i
            if last_import_idx >= 0:
                lines.insert(last_import_idx + 1, imp.rstrip('\n'))
            else:
                lines.insert(0, imp.rstrip('\n'))
            src = '\n'.join(lines)

    if src != orig:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(src)
        return True
    return False

count = 0
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in ('node_modules',)]
    for fn in filenames:
        if not fn.endswith(('.js', '.jsx')):
            continue
        p = os.path.join(dirpath, fn)
        if process_file(p):
            count += 1
            print('refactored', os.path.relpath(p, '/home/user/frontend'))

print('\nTotal files changed:', count)
