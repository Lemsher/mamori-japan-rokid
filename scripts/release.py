"""Create portable source/import archives after `pnpm run pack`."""
import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
VERSION = json.loads((ROOT / 'package.json').read_text())['version']
DIST = ROOT / 'dist'
EXCLUDED = {'.git', '.cache', 'node_modules', '__pycache__', 'dist', 'reference'}


def included(path):
    relative = path.relative_to(ROOT)
    return (path.is_file() and not any(part in EXCLUDED for part in relative.parts)
            and path.name != '.DS_Store' and path.suffix != '.pyc'
            and not (path.name.startswith('.env') and path.name != '.env.example')
            and path.name != 'config.local.js')


def archive(name, paths, prefix=''):
    output = DIST / name
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as bundle:
        for path in sorted(paths):
            if included(path):
                bundle.write(path, prefix + path.relative_to(ROOT).as_posix())
    with zipfile.ZipFile(output) as bundle:
        assert bundle.testzip() is None
        assert not any('.DS_Store' in name for name in bundle.namelist())
    print(f'{output.name}: {output.stat().st_size:,} bytes')


DIST.mkdir(exist_ok=True)
archive(f'mamori-japan-{VERSION}-studio.zip', (ROOT / 'agent').rglob('*'))
archive(f'mamori-japan-{VERSION}-source.zip', ROOT.rglob('*'), f'mamori-japan-{VERSION}/')
artifacts = sorted([*DIST.glob('*.aix'), *DIST.glob('*.zip')])
(DIST / 'SHA256SUMS.txt').write_text(''.join(
    f'{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.name}\n' for path in artifacts))
