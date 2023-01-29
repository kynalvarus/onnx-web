from basicsr.archs.rrdbnet_arch import RRDBNet
from logging import getLogger
from os import path
from PIL import Image
from realesrgan import RealESRGANer

from ..onnx import (
    OnnxNet,
)
from ..params import (
    ImageParams,
    StageParams,
    UpscaleParams,
)
from ..utils import (
    ServerContext,
)

import numpy as np

logger = getLogger(__name__)

last_pipeline_instance = None
last_pipeline_params = (None, None)


def load_resrgan(ctx: ServerContext, params: UpscaleParams, tile=0):
    global last_pipeline_instance
    global last_pipeline_params

    model_file = '%s.%s' % (params.upscale_model, params.format)
    model_path = path.join(ctx.model_path, model_file)
    if not path.isfile(model_path):
        raise Exception('Real ESRGAN model not found at %s' % model_path)

    cache_params = (model_path, params.format)
    if last_pipeline_instance != None and cache_params == last_pipeline_params:
        logger.info('reusing existing Real ESRGAN pipeline')
        return last_pipeline_instance

    # use ONNX acceleration, if available
    if params.format == 'onnx':
        model = OnnxNet(ctx, model_file, provider=params.provider)
    elif params.format == 'pth':
        model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64,
                        num_block=23, num_grow_ch=32, scale=params.scale)
        raise Exception('unknown platform %s' % params.format)

    dni_weight = None
    if params.upscale_model == 'realesr-general-x4v3' and params.denoise != 1:
        wdn_model_path = model_path.replace(
            'realesr-general-x4v3', 'realesr-general-wdn-x4v3')
        model_path = [model_path, wdn_model_path]
        dni_weight = [params.denoise, 1 - params.denoise]

    # TODO: shouldn't need the PTH file
    upsampler = RealESRGANer(
        scale=params.scale,
        model_path=path.join(ctx.model_path, '%s.pth' % params.upscale_model),
        dni_weight=dni_weight,
        model=model,
        tile=tile,
        tile_pad=params.tile_pad,
        pre_pad=params.pre_pad,
        half=params.half)

    last_pipeline_instance = upsampler
    last_pipeline_params = cache_params

    return upsampler


def upscale_resrgan(
    ctx: ServerContext,
    stage: StageParams,
    _params: ImageParams,
    source_image: Image.Image,
    *,
    upscale: UpscaleParams,
    **kwargs,
) -> Image.Image:
    logger.info('upscaling image with Real ESRGAN', upscale.scale)

    output = np.array(source_image)
    upsampler = load_resrgan(ctx, upscale, tile=stage.tile_size)

    output, _ = upsampler.enhance(output, outscale=upscale.outscale)

    output = Image.fromarray(output, 'RGB')
    logger.info('final output image size', output.size)
    return output
