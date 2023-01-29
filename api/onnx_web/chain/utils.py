from logging import getLogger
from PIL import Image
from typing import List, Protocol, Tuple

logger = getLogger(__name__)


class TileCallback(Protocol):
    def __call__(self, image: Image.Image, dims: Tuple[int, int, int]) -> Image.Image:
        pass


def process_tile_grid(
    source: Image.Image,
    tile: int,
    scale: int,
    filters: List[TileCallback],
) -> Image.Image:
    width, height = source.size
    image = Image.new('RGB', (width * scale, height * scale))

    tiles_x = width // tile
    tiles_y = height // tile
    total = tiles_x * tiles_y

    for y in range(tiles_y):
        for x in range(tiles_x):
            idx = (y * tiles_x) + x
            left = x * tile
            top = y * tile
            logger.info('processing tile %s of %s, %s.%s', idx + 1, total, y, x)
            tile_image = source.crop((left, top, left + tile, top + tile))

            for filter in filters:
                tile_image = filter(tile_image, (left, top, tile))

            image.paste(tile_image, (left * scale, top * scale))

    return image


def process_tile_spiral(
    source: Image.Image,
    tile: int,
    scale: int,
    filters: List[TileCallback],
    overlap: float = 0.5,
) -> Image.Image:
    if scale != 1:
        raise Exception('unsupported scale')

    width, height = source.size
    image = Image.new('RGB', (width * scale, height * scale))
    image.paste(source, (0, 0, width, height))

    center_x = (width // 2) - (tile // 2)
    center_y = (height // 2) - (tile // 2)

    # TODO: only valid for overlap = 0.5
    if overlap == 0.5:
        tiles = [
            (0, tile * -overlap),
            (tile * overlap, tile * -overlap),
            (tile * overlap, 0),
            (tile * overlap, tile * overlap),
            (0, tile * overlap),
            (tile * -overlap, tile * overlap),
            (tile * -overlap, 0),
            (tile * -overlap, tile * -overlap),
        ]

    # tile tuples is source, multiply by scale for dest
    counter = 0
    for left, top in tiles:
        left = center_x + int(left)
        top = center_y + int(top)

        counter += 1
        logger.info('processing tile %s of %s', counter, len(tiles))

        # TODO: only valid for scale == 1, resize source for others
        tile_image = image.crop((left, top, left + tile, top + tile))

        for filter in filters:
            tile_image = filter(tile_image, (left, top, tile))

        image.paste(tile_image, (left * scale, top * scale))

    return image
