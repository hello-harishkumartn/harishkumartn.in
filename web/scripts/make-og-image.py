"""Regenerate public/og-image.png (1200x630). Run: python3 scripts/make-og-image.py (needs Pillow)."""
import sys
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
out = sys.argv[1] if len(sys.argv) > 1 else "public/og-image.png"
img = Image.new("RGB", (W, H), "#fdf3e7")
d = ImageDraw.Draw(img)
a, b = (255, 122, 89), (140, 122, 230)
for x in range(W):
    t = x / W
    d.line([(x, H - 40), (x, H)], fill=tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3)))

def font(size, bold=True):
    for name in ["DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf", "Arial Bold.ttf", "Arial.ttf"]:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()

# monogram tile
d.rounded_rectangle([90, 90, 250, 250], radius=40, fill=(255, 122, 89))
d.text((170, 170), "HK", font=font(76), fill="white", anchor="mm")
d.text((90, 330), "Harish Kumar T N", font=font(78), fill="#2a2438")
d.text((92, 435), "code · markets · badminton · trips", font=font(40, bold=False), fill="#5b5470")
d.text((92, 500), "harishkumartn.in", font=font(34), fill="#8c7ae6")
img.save(out)
print("wrote", out)
