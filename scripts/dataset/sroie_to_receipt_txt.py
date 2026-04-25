from pathlib import Path
import sys

ROOT = Path("training/sroie/SROIE2019/train")
BOX_DIR = ROOT / "box"
IMG_DIR = ROOT / "img"
OUTPUT_PATH = Path("data/input/receipt.txt")

if len(sys.argv) < 2:
    samples = sorted(BOX_DIR.glob("*.txt"))[:10]

    print("Usage:")
    print("  python scripts/dataset/sroie_to_receipt_txt.py <receipt_id>")
    print("\nExample:")
    if samples:
        print(f"  python scripts/dataset/sroie_to_receipt_txt.py {samples[0].stem}")

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

OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
OUTPUT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")

print(f"Wrote {OUTPUT_PATH} from: {box_file}")

if img_file.exists():
    print(f"Image path: {img_file}")
    print("Open it with:")
    print(f"  open {img_file}")
    print("\nNext run:")
    print("  npm run parse")
