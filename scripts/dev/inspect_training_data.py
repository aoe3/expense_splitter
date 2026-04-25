from pathlib import Path

ROOT = Path("training/sroie/SROIE2019/train")

print("\nSample files in train:\n")

for path in ROOT.rglob("*"):
    if path.is_file():
        print(path)
        break

print("\nFile types breakdown:\n")

types = {}

for path in ROOT.rglob("*"):
    if path.is_file():
        ext = path.suffix
        types[ext] = types.get(ext, 0) + 1

for ext, count in types.items():
    print(ext, count)
