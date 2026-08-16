from pathlib import Path

source = Path(r"C:\Repo\09_ASCETCopilot\pi-ascet-extension-prototype\artifacts\_tmp-aeb-avh-report.txt")
target = source.with_name("_tmp-aeb-avh-report-fixed.txt")
reverse_cp1252 = {}
for value in range(0x80, 0xA0):
    try:
        reverse_cp1252[bytes([value]).decode("cp1252")] = value
    except UnicodeDecodeError:
        pass

def repair(value: str) -> str:
    raw = bytearray()
    for char in value:
        code = ord(char)
        if code <= 0xFF:
            raw.append(code)
        elif char in reverse_cp1252:
            raw.append(reverse_cp1252[char])
        else:
            return value
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        return value

text = source.read_text(encoding="utf-8")
fixed = "\n".join(repair(line) for line in text.splitlines())
target.write_text(fixed, encoding="utf-8")
print(target)
