"""Build an offline postcode-to-municipality index from Japan Post's UTF-8 ZIP."""
import csv,hashlib,io,json,sys,zipfile
from pathlib import Path
root=Path(__file__).resolve().parents[1]
archive=Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/mamori-postcodes.zip')
with zipfile.ZipFile(archive) as z:
    data=z.read(next(n for n in z.namelist() if n.lower().endswith('.csv'))).decode('utf-8-sig')
groups={}
for row in csv.reader(io.StringIO(data)):
    if len(row)>=9 and len(row[2])==7:groups.setdefault(row[0],set()).add(row[2])
rows=[[code,' '+' '.join(sorted(codes))+' '] for code,codes in sorted(groups.items())]
(root/'data/postal-groups.json').write_text(json.dumps(rows,ensure_ascii=False,separators=(',',':'))+'\n')
(root/'agent/modules/postal-data.js').write_text('// Japan Post, published 2026-08-31; municipality candidates only.\nexport const POSTAL_GROUPS='+json.dumps(rows,separators=(',',':'))+';\n')
coasts=json.loads((root/'data/tsunami-areas.json').read_text())
(root/'agent/modules/coast-data.js').write_text('// JMA tsunami forecast areas; user must confirm the relevant coast.\nexport const COASTS='+json.dumps(coasts,ensure_ascii=False,separators=(',',':'))+';\n')
(root/'data/postal-source.json').write_text(json.dumps({'source':'https://www.post.japanpost.jp/service/search/zipcode/download/utf/zip/utf_ken_all.zip','publishedAt':'2026-08-31','retrievedAt':'2026-09-11','sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'municipalities':len(rows),'postcodes':len(set(x for _,codes in rows for x in codes.split()))},ensure_ascii=False,indent=2)+'\n')
print(len(rows),'municipal groups; source ZIP verified and index generated')
