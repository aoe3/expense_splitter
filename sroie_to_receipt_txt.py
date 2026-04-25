from pathlib import Path
import sys

ROOT = Path("training/sroie/SROIE2019/train")
BOX_DIR = ROOT / "box"
IMG_DIR = ROOT / "img"

if len(sys.argv) < 2:
    samples = sorted(BOX_DIR.glob("*.txt"))[:10]

    print("Usage:")
    print("  python sroie_to_receipt_txt.py <receipt_id>")
    print("\nExample:")
    if samples:
        print(f"  python sroie_to_receipt_txt.py {samples[0].stem}")

    print("\nSample IDs:")
    for sample in samples:
        print(f"  {sample.stem}")

    sys.exit(0)

receipt_id = sys.argv[1].replace(".jpg", "").replace(".txt", "")

box_file = BOX_DIR / f"{receipt_id}.txt"
img_file = IMG_DIR / f"{receipt_id}.jpg"

if not box_file.exists():
    print(f"Could not find box file: {box_file}")
    sys.exit(1)

lines = []

with open(box_file, "r", encoding="utf-8") as f:
    for raw in f:
        raw = raw.strip()
        if not raw:
            continue

        parts = raw.split(",", 8)

        if len(parts) < 9:
            continue

        text = parts[8].strip()

        if text:
            lines.append(text)

with open("receipt.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(lines))
    f.write("\n")

print(f"Wrote receipt.txt from: {box_file}")

if img_file.exists():
    print(f"Image path: {img_file}")
    print(f"Open it with:")
    print(f"  open {img_file}")