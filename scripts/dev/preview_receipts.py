from pathlib import Path

ROOT = Path("training/sroie/SROIE2019/train")

BOX_DIR = ROOT / "box"
IMG_DIR = ROOT / "img"

sample = list(BOX_DIR.glob("*.txt"))[0]
receipt_id = sample.stem

print(f"\nReceipt: {receipt_id}\n")

with open(sample, encoding="utf-8") as f:
    lines = f.readlines()

print("OCR lines:\n")

for line in lines[:30]:
    parts = line.strip().split(",")
    text = parts[-1]
    print(text)

print("\nImage path:")
print(IMG_DIR / f"{receipt_id}.jpg")
