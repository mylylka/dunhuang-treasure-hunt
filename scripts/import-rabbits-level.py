"""Build the Three Rabbits comparison pair from the two archived deliveries."""
from hashlib import sha256
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / 'art-source/levels/patterns-rabbits/v001'
RUNTIME = ROOT / 'public/assets/levels/patterns-rabbits'
REFERENCE_SIZE = (665, 662)
EDIT_SIZE = (1254, 1254)

# All coordinates use the reference grid. Source boxes sample the resized edit
# and locally align the changed motifs with their reference silhouettes.
PATCHES = [
    ('red-petal', (151, 159, 271, 277), (154, 161, 268, 276), [
        (154, 232), (161, 217), (172, 196), (176, 189), (191, 183), (217, 170),
        (236, 161), (247, 161), (258, 166), (265, 178), (269, 198), (268, 210),
        (257, 222), (237, 229), (218, 231), (209, 242), (204, 259), (192, 274),
        (181, 271), (165, 261), (156, 249),
    ]),
    ('green-skirt', (561, 474, 624, 548), (557, 474, 625, 550), [
        (568, 536), (580, 519), (589, 511), (595, 502), (592, 490), (592, 480),
        (603, 478), (612, 475), (617, 479), (620, 496), (620, 505), (613, 519),
        (603, 528), (588, 537), (571, 545), (564, 546),
    ]),
    ('missing-rabbit', (339, 285, 385, 372), (339, 285, 385, 372), [
        (355, 286), (375, 287), (380, 301), (381, 330), (378, 350), (373, 370),
        (355, 371), (352, 352), (353, 335), (340, 330), (340, 315), (351, 307),
    ]),
    ('white-lotus', (19, 32, 71, 79), (19, 32, 71, 79), [
        (34, 35), (49, 33), (60, 36), (65, 44), (69, 53), (69, 63), (62, 73),
        (55, 78), (35, 77), (22, 71), (21, 61), (27, 55), (33, 49),
    ]),
    ('blue-skirt', (494, 41, 567, 122), (494, 40, 576, 133), [
        (495, 47), (508, 47), (523, 44), (539, 42), (548, 51), (542, 56),
        (536, 60), (544, 67), (549, 77), (552, 90), (558, 106), (565, 119),
        (559, 120), (546, 110), (536, 99), (529, 86), (521, 75), (506, 69),
        (500, 63), (495, 60),
    ]),
]


def main() -> None:
    source_paths = [ARCHIVE / 'reference-original.jpg', ARCHIVE / 'variation-original.png']
    reference, variation = [Image.open(path).convert('RGB') for path in source_paths]
    if reference.size != REFERENCE_SIZE or variation.size != EDIT_SIZE:
        raise ValueError('原稿尺寸已变更，需重新校准五处纹样。')
    aligned = variation.resize(reference.size, Image.Resampling.LANCZOS)
    composite = reference.copy()
    mask_union = Image.new('L', reference.size)
    for target, box, sample, outline in PATCHES:
        shape = Image.new('L', reference.size)
        ImageDraw.Draw(shape).polygon(outline, fill=255)
        # Keep the feather entirely inside the traced motif.
        feather = 2.5 if target == 'missing-rabbit' else 1.25
        mask = ImageChops.multiply(shape, shape.filter(ImageFilter.GaussianBlur(feather)))
        width, height = box[2] - box[0], box[3] - box[1]
        patch = aligned.crop(sample).resize((width, height), Image.Resampling.LANCZOS)
        composite.paste(patch, box[:2], mask.crop(box))
        mask_union = ImageChops.lighter(mask_union, mask)
        if ImageChops.difference(reference.crop(box), composite.crop(box)).getbbox() is None:
            raise ValueError(f'没有检测到差异：{target}')

    delta = ImageChops.difference(reference, composite)
    outside = delta.copy()
    outside.paste((0, 0, 0), (0, 0), mask_union.point(lambda value: 255 if value else 0))
    if outside.getbbox() is not None:
        raise ValueError('五处目标之外存在像素变化。')

    RUNTIME.mkdir(parents=True, exist_ok=True)
    for side, image in [('a', reference), ('b', composite)]:
        image.save(RUNTIME / f'patterns-rabbits-{side}-v001.png', optimize=True)
    mask_union.save(ARCHIVE / 'difference-mask.png', optimize=True)
    record = {
        'originals': [
            {'role': role, 'archive': path.name, 'size': list(size),
             'sha256': sha256(path.read_bytes()).hexdigest()}
            for role, path, size in zip(['reference', 'variation'], source_paths,
                                        [REFERENCE_SIZE, EDIT_SIZE])
        ],
        'runtimeSize': list(REFERENCE_SIZE),
        'targets': [
            {'id': target, 'referenceBox': box, 'sampleBoxOnReferenceGrid': sample, 'outline': outline}
            for target, box, sample, outline in PATCHES
        ],
        'outsideMaskChangedPixels': 0,
    }
    (ARCHIVE / 'processing.json').write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
