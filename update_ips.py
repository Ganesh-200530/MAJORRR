import os

files = [
    'frontend/src/screens/AuthScreen.tsx',
    'frontend/src/screens/ChatScreen.tsx',
    'web/src/screens/AuthScreen.tsx',
    'web/src/screens/ChatScreen.tsx',
    'web/src/components/DashboardModal.tsx'
]

ip = '192.168.29.173:8000'

for path in files:
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()

        content = content.replace('http://192.168.1.12:8000', f'http://{ip}')
        content = content.replace('http://localhost:8000', f'http://{ip}')

        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Updated {path}')
    except Exception as e:
        print(f'Error updating {path}: {e}')
