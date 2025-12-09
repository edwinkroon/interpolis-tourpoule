"""
Validate that the SQL file is correct and doesn't contain Python code
"""

import re

with open('imports/import-etappe-1-uitslag.sql', 'r', encoding='utf-8') as f:
    content = f.read()

# Check for Python-specific syntax
issues = []

# Check for triple quotes (Python docstrings)
if '"""' in content:
    issues.append("Found triple quotes (Python docstrings)")

# Check for Python imports
if re.search(r'^\s*import\s+\w+', content, re.MULTILINE):
    issues.append("Found Python import statements")

# Check for Python function definitions
if re.search(r'^\s*def\s+\w+', content, re.MULTILINE):
    issues.append("Found Python function definitions")

# Check for Python print statements
if re.search(r'^\s*print\s*\(', content, re.MULTILINE):
    issues.append("Found Python print statements")

# Check that it starts with SQL comment
if not content.strip().startswith('--'):
    issues.append("File does not start with SQL comment")

# Check for SQL keywords
sql_keywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DO $$']
has_sql = any(keyword in content.upper() for keyword in sql_keywords)

if issues:
    print("❌ Issues found:")
    for issue in issues:
        print(f"   - {issue}")
    exit(1)
elif has_sql:
    print("✅ SQL file is valid")
    print(f"   - File size: {len(content)} characters")
    print(f"   - Lines: {len(content.splitlines())}")
    print("   - Contains SQL keywords")
else:
    print("⚠️  File doesn't appear to contain SQL")
    exit(1)

