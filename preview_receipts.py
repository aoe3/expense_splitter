from pathlib import Path

ROOT = Path("training/sroie/SROIE2019/train")

BOX_DIR = ROOT / "box"
IMG_DIR = ROOT / "img"

# pick one receipt
sample = list(BOX_DIR.glob("*.txt"))[0]
receipt_id = sample.stem

print(f"\nReceipt: {receipt_id}\n")

# show OCR lines
with open(sample) as f:
    lines = f.readlines()

print("OCR lines:\n")

for line in lines[:30]:
    parts = line.strip().split(",")
    text = parts[-1]
    print(text)

print("\nImage path:")
print(IMG_DIR / f"{receipt_id}.jpg")