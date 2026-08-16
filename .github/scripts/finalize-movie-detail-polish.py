from pathlib import Path

path = Path('src/main/ipc/register-movies-ipc.test.ts')
text = path.read_text()
old = "expect(() => handler({}, { query: '' })).toThrow()"
new = "await expect(handler({}, { query: '' })).rejects.toThrow()"
if old not in text:
    raise SystemExit('async search assertion not found')
path.write_text(text.replace(old, new))
