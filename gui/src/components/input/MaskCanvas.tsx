import { doesExist, Maybe, mustExist } from '@apextoaster/js-utils';
import { FormatColorFill, Gradient, InvertColors } from '@mui/icons-material';
import { Button, Stack, Typography } from '@mui/material';
import { throttle } from 'lodash';
import React, { RefObject, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';

import { SAVE_TIME } from '../../config.js';
import { ConfigContext, StateContext } from '../../state.js';
import { NumericField } from './NumericField';

export const FULL_CIRCLE = 2 * Math.PI;
export const FULL_OPACITY = 1.0;
export const MASK_OPACITY = 0.75;
export const PIXEL_SIZE = 4;
export const PIXEL_WEIGHT = 3;

export const COLORS = {
  black: 0,
  white: 255,
};

export const THRESHOLDS = {
  lower: 34,
  upper: 224,
};

export const MASK_STATE = {
  clean: 'clean',
  painting: 'painting',
  dirty: 'dirty',
};

export type FloodFn = (n: number) => number;

export interface Point {
  x: number;
  y: number;
}

export interface MaskCanvasProps {
  source?: Maybe<Blob>;
  mask?: Maybe<Blob>;

  onSave: (blob: Blob) => void;
}

export function MaskCanvas(props: MaskCanvasProps) {
  const { source, mask } = props;
  const { params } = mustExist(useContext(ConfigContext));

  function drawBuffer() {
    if (doesExist(brushRef.current) && doesExist(bufferRef.current) && doesExist(canvasRef.current)) {
      const { ctx } = getClearContext(canvasRef);
      ctx.globalAlpha = MASK_OPACITY;
      ctx.drawImage(bufferRef.current, 0, 0);

      if (maskState.current !== MASK_STATE.painting) {
        ctx.drawImage(brushRef.current, 0, 0);
      }
    }
  }

  function drawBrush(point: Point): void {
    const { ctx } = getClearContext(brushRef);
    ctx.fillStyle = grayToRGB(brush.color, brush.strength);

    drawCircle(ctx, {
      x: point.x,
      y: point.y,
    }, brush.size);

    drawBuffer();
  }

  function drawClicks(): void {
    if (clicks.length > 0) {
      const { ctx } = getContext(bufferRef);
      ctx.fillStyle = grayToRGB(brush.color, brush.strength);

      for (const click of clicks) {
        drawCircle(ctx, click, brush.size);
      }

      clicks.length = 0;

      drawBuffer();
    }
  }

  function drawSource(file: Blob): void {
    const image = new Image();
    image.onload = () => {
      const { canvas, ctx } = getClearContext(bufferRef);
      ctx.globalAlpha = FULL_OPACITY;
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      URL.revokeObjectURL(src);

      drawBuffer();
    };

    const src = URL.createObjectURL(file);
    image.src = src;
  }

  function finishPainting() {
    if (doesExist(brushRef.current)) {
      getClearContext(brushRef);
    }

    drawClicks();

    if (maskState.current === MASK_STATE.painting) {
      maskState.current = MASK_STATE.dirty;
    }
  }

  function saveMask(): void {
    if (doesExist(bufferRef.current)) {
      if (maskState.current === MASK_STATE.clean) {
        return;
      }

      bufferRef.current.toBlob((blob) => {
        maskState.current = MASK_STATE.clean;
        props.onSave(mustExist(blob));
      });
    }
  }

  const save = useMemo(() => throttle(saveMask, SAVE_TIME), []);

  // eslint-disable-next-line no-null/no-null
  const brushRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line no-null/no-null
  const bufferRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line no-null/no-null
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // painting state
  const maskState = useRef(MASK_STATE.clean);
  const [background, setBackground] = useState<string>();
  const [clicks, setClicks] = useState<Array<Point>>([]);

  const state = mustExist(useContext(StateContext));
  const brush = useStore(state, (s) => s.brush);
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const setBrush = useStore(state, (s) => s.setBrush);

  useEffect(() => {
    if (maskState.current === MASK_STATE.dirty) {
      save();
    }
  }, [maskState.current]);

  useEffect(() => {
    if (doesExist(bufferRef.current) && doesExist(mask)) {
      drawSource(mask);
    }
  }, [mask]);

  useEffect(() => {
    if (doesExist(source)) {
      if (doesExist(background)) {
        URL.revokeObjectURL(background);
      }

      setBackground(URL.createObjectURL(source));

      // initialize the mask if it does not exist
      if (doesExist(mask) === false) {
        getClearContext(bufferRef);
        maskState.current = MASK_STATE.dirty;
      }
    }
  }, [source]);

  // last resort to draw lost clicks
  drawClicks();

  const styles: React.CSSProperties = {
    backgroundPosition: 'top left',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'contain',
    border: '1px solid black',
    maxHeight: params.height.default,
    maxWidth: params.width.default,
  };

  if (doesExist(background)) {
    styles.backgroundImage = `url(${background})`;
  }

  return <Stack spacing={2}>
    <canvas
      ref={brushRef}
      height={params.height.default}
      width={params.width.default}
      style={{
        display: 'none',
      }}
    />
    <canvas
      ref={bufferRef}
      height={params.height.default}
      width={params.width.default}
      style={{
        display: 'none',
      }}
    />
    <canvas
      ref={canvasRef}
      height={params.height.default}
      width={params.width.default}
      style={styles}
      onClick={(event) => {
        const canvas = mustExist(canvasRef.current);
        const bounds = canvas.getBoundingClientRect();

        setClicks([...clicks, {
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top,
        }]);

        drawClicks();
        maskState.current = MASK_STATE.dirty;
      }}
      onMouseDown={() => {
        maskState.current = MASK_STATE.painting;
      }}
      onMouseLeave={finishPainting}
      onMouseOut={finishPainting}
      onMouseUp={finishPainting}
      onMouseMove={(event) => {
        const canvas = mustExist(canvasRef.current);
        const bounds = canvas.getBoundingClientRect();

        if (maskState.current === MASK_STATE.painting) {
          setClicks([...clicks, {
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
          }]);
        } else {
          drawBrush({
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
          });
        }
      }}
    />
    <Typography variant='body1'>
      Black pixels in the mask will stay the same, white pixels will be replaced. The masked pixels will be blended
      with the noise source before the diffusion model runs, giving it more variety to use.
    </Typography>
    <Stack direction='row' spacing={4}>
      <NumericField
        label='Brush Color'
        min={COLORS.black}
        max={COLORS.white}
        step={1}
        value={brush.color}
        onChange={(color) => {
          setBrush({ color });
        }}
      />
      <NumericField
        label='Brush Size'
        min={1}
        max={64}
        step={1}
        value={brush.size}
        onChange={(size) => {
          setBrush({ size });
        }}
      />
      <NumericField
        decimal
        label='Brush Strength'
        min={0}
        max={1}
        step={0.01}
        value={brush.strength}
        onChange={(strength) => {
          setBrush({ strength });
        }}
      />
      <Button
        variant='outlined'
        startIcon={<FormatColorFill />}
        onClick={() => {
          floodCanvas(bufferRef, floodBlack);
          drawBuffer();
          maskState.current = MASK_STATE.dirty;
        }}>
        Fill with black
      </Button>
      <Button
        variant='outlined'
        startIcon={<FormatColorFill />}
        onClick={() => {
          floodCanvas(bufferRef, floodWhite);
          drawBuffer();
          maskState.current = MASK_STATE.dirty;
        }}>
        Fill with white
      </Button>
      <Button
        variant='outlined'
        startIcon={<InvertColors />}
        onClick={() => {
          floodCanvas(bufferRef, floodInvert);
          drawBuffer();
          maskState.current = MASK_STATE.dirty;
        }}>
        Invert
      </Button>
      <Button
        variant='outlined'
        startIcon={<Gradient />}
        onClick={() => {
          floodCanvas(bufferRef, floodBelow);
          drawBuffer();
          maskState.current = MASK_STATE.dirty;
        }}>
        Gray to black
      </Button>
      <Button
        variant='outlined'
        startIcon={<Gradient />}
        onClick={() => {
          floodCanvas(bufferRef, floodAbove);
          drawBuffer();
          maskState.current = MASK_STATE.dirty;
        }}>
        Gray to white
      </Button>
    </Stack>
  </Stack>;
}

function getContext(ref: RefObject<HTMLCanvasElement>) {
  const canvas = mustExist(ref.current);
  const ctx = mustExist(canvas.getContext('2d'));

  return { canvas, ctx };
}

function getClearContext(ref: RefObject<HTMLCanvasElement>) {
  const ret = getContext(ref);
  ret.ctx.clearRect(0, 0, ret.canvas.width, ret.canvas.height);

  return ret;
}

function drawCircle(ctx: CanvasRenderingContext2D, point: Point, size: number): void {
  ctx.beginPath();
  ctx.arc(point.x, point.y, size, 0, FULL_CIRCLE);
  ctx.fill();
}

export function floodBelow(n: number): number {
  if (n < THRESHOLDS.upper) {
    return COLORS.black;
  } else {
    return COLORS.white;
  }
}

export function floodAbove(n: number): number {
  if (n > THRESHOLDS.lower) {
    return COLORS.white;
  } else {
    return COLORS.black;
  }
}

export function floodBlack(): number {
  return COLORS.black;
}

export function floodWhite(): number {
  return COLORS.white;
}

export function floodInvert(n: number): number {
  return COLORS.white - n;
}

export function grayToRGB(n: number, o = 1.0): string {
  return `rgba(${n.toFixed(0)},${n.toFixed(0)},${n.toFixed(0)},${o.toFixed(2)})`;
}

function floodCanvas(ref: RefObject<HTMLCanvasElement>, flood: FloodFn) {
  const { canvas, ctx } = getContext(ref);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = image.data;

  for (let x = 0; x < canvas.width; ++x) {
    for (let y = 0; y < canvas.height; ++y) {
      const i = (y * canvas.width * PIXEL_SIZE) + (x * PIXEL_SIZE);
      const hue = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / PIXEL_WEIGHT;
      const final = flood(hue);

      pixels[i] = final;
      pixels[i + 1] = final;
      pixels[i + 2] = final;
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      pixels[i + 3] = COLORS.white; // fully opaque
    }
  }

  ctx.putImageData(image, 0, 0);
}