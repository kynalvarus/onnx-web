from diffusers import (
    StableDiffusionUpscalePipeline,
)
from logging import getLogger
from os import path
from PIL import Image

from ..diffusion.pipeline_onnx_stable_diffusion_upscale import (
    OnnxStableDiffusionUpscalePipeline,
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
import torch

logger = getLogger(__name__)


last_pipeline_instance = None
last_pipeline_params = (None, None)


def load_stable_diffusion(ctx: ServerContext, upscale: UpscaleParams):
    global last_pipeline_instance
    global last_pipeline_params

    model_path = path.join(ctx.model_path, upscale.upscale_model)
    cache_params = (model_path, upscale.format)

    if last_pipeline_instance != None and cache_params == last_pipeline_params:
        logger.info('reusing existing Stable Diffusion upscale pipeline')
        return last_pipeline_instance

    if upscale.format == 'onnx':
        pipeline = OnnxStableDiffusionUpscalePipeline.from_pretrained(model_path)
    else:
        pipeline = StableDiffusionUpscalePipeline.from_pretrained(model_path)

    last_pipeline_instance = pipeline
    last_pipeline_params = cache_params

    return pipeline


def upscale_stable_diffusion(
    ctx: ServerContext,
    _stage: StageParams,
    params: ImageParams,
    source: Image.Image,
    *,
    upscale: UpscaleParams,
    prompt: str = None,
    **kwargs,
) -> Image.Image:
    prompt = prompt or params.prompt
    logger.info('upscaling with Stable Diffusion, %s steps: %s', params.steps, prompt)

    pipeline = load_stable_diffusion(ctx, upscale)

    if upscale.format == 'onnx':
        generator = np.random.default_rng(params.seed)
    else:
        generator = torch.manual_seed(params.seed)

    return pipeline(
        params.prompt,
        source,
        generator=generator,
        num_inference_steps=params.steps,
    ).images[0]
