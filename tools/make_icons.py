# Рисует иконки приложения: тарелка, вилка и нож на тёплом градиенте.
import os
from PIL import Image, ImageDraw

N = 1024
img = Image.new('RGB', (N, N))
top, bot = (255, 159, 10), (255, 94, 58)
px = img.load()
for y in range(N):
    t = y / (N - 1)
    col = tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3))
    for x in range(N):
        px[x, y] = col

d = ImageDraw.Draw(img)
W = (255, 255, 255)
cx, cy = N // 2, N // 2 + 10
d.ellipse([cx - 250, cy - 250, cx + 250, cy + 250], outline=W, width=34)
d.ellipse([cx - 160, cy - 160, cx + 160, cy + 160], outline=W, width=18)

fx = 150
for dx in (-36, 0, 36):
    d.rounded_rectangle([fx + dx - 9, 270, fx + dx + 9, 430], radius=9, fill=W)
d.rounded_rectangle([fx - 45, 410, fx + 45, 450], radius=20, fill=W)
d.rounded_rectangle([fx - 17, 430, fx + 17, 770], radius=17, fill=W)

kx = 874
d.rounded_rectangle([kx - 17, 520, kx + 17, 770], radius=17, fill=W)
d.pieslice([kx - 70, 250, kx + 30, 560], 270, 90, fill=W)
d.rectangle([kx - 20, 400, kx + 20, 540], fill=W)

os.makedirs('icons', exist_ok=True)
for s in (180, 512):
    img.resize((s, s), Image.LANCZOS).save(f'icons/icon-{s}.png', optimize=True)
