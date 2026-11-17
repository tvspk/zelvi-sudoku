# Náhrada zipalign: resources.arsc nekomprimovaně, nekomprimované položky zarovnané na 4 B (.so na 4 KiB).
import sys, zipfile
src, dst = sys.argv[1], sys.argv[2]
zin = zipfile.ZipFile(src)
with open(dst, 'wb') as f:
    zout = zipfile.ZipFile(f, 'w')
    for info in zin.infolist():
        data = zin.read(info.filename)
        ni = zipfile.ZipInfo(info.filename, date_time=(2026,1,1,0,0,0))
        ni.external_attr = info.external_attr
        store = info.filename == 'resources.arsc' or info.compress_type == zipfile.ZIP_STORED or info.filename.endswith('.png')
        ni.compress_type = zipfile.ZIP_STORED if store else zipfile.ZIP_DEFLATED
        if store:
            al = 4096 if info.filename.endswith('.so') else 4
            hdr = 30 + len(ni.filename.encode('utf-8'))
            pad = (-(f.tell() + hdr + 4)) % al   # 4 = hlavička extra pole
            ni.extra = b'\xd9\xd9' + pad.to_bytes(2, 'little') + b'\0' * pad  # 0xd9d9 = alignment extra (jako zipalign)
        zout.writestr(ni, data)
    zout.close()
# ověření
z = zipfile.ZipFile(dst)
with open(dst, 'rb') as f:
    for i in z.infolist():
        if i.compress_type == zipfile.ZIP_STORED:
            f.seek(i.header_offset + 26); n = int.from_bytes(f.read(2),'little'); e = int.from_bytes(f.read(2),'little')
            off = i.header_offset + 30 + n + e
            assert off % 4 == 0, (i.filename, off)
print('zarovnáno:', dst)
