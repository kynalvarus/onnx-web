import { doesExist, mustExist } from '@apextoaster/js-utils';
import { Brush, ContentCopy, ContentCopyTwoTone, Delete, Download } from '@mui/icons-material';
import { Box, Button, Card, CardContent, CardMedia, Grid, Paper } from '@mui/material';
import * as React from 'react';
import { useContext } from 'react';
import { useStore } from 'zustand';

import { ApiResponse } from '../client.js';
import { StateContext } from '../state.js';

export interface ImageCardProps {
  value: ApiResponse;

  onDelete?: (key: ApiResponse) => void;
}

export function GridItem(props: { xs: number; children: React.ReactNode }) {
  return <Grid item xs={props.xs}>
    <Paper elevation={0} sx={{ padding: 1 }}>{props.children}</Paper>
  </Grid>;
}

export function ImageCard(props: ImageCardProps) {
  const { value } = props;
  const { params, output, size } = value;

  const state = mustExist(useContext(StateContext));
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const setImg2Img = useStore(state, (s) => s.setImg2Img);
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const setInpaint = useStore(state, (s) => s.setInpaint);

  async function loadSource() {
    const req = await fetch(output.url);
    return req.blob();
  }

  async function copySourceToImg2Img() {
    const blob = await loadSource();
    setImg2Img({
      source: blob,
    });
  }

  async function copySourceToInpaint() {
    const blob = await loadSource();
    setInpaint({
      source: blob,
    });
  }

  function deleteImage() {
    if (doesExist(props.onDelete)) {
      props.onDelete(value);
    }
  }

  function downloadImage() {
    window.open(output.url, '_blank');
  }

  return <Card sx={{ maxWidth: size.width }} elevation={2}>
    <CardMedia sx={{ height: size.height }}
      component='img'
      image={output.url}
      title={params.prompt}
    />
    <CardContent>
      <Box>
        <Grid container spacing={2}>
          <GridItem xs={4}>CFG: {params.cfg}</GridItem>
          <GridItem xs={4}>Steps: {params.steps}</GridItem>
          <GridItem xs={4}>Size: {size.width}x{size.height}</GridItem>
          <GridItem xs={4}>Seed: {params.seed}</GridItem>
          <GridItem xs={8}>Scheduler: {params.scheduler}</GridItem>
          <GridItem xs={12}>{params.prompt}</GridItem>
          <GridItem xs={2}>
            <Button onClick={downloadImage}>
              <Download />
            </Button>
          </GridItem>
          <GridItem xs={2}>
            <Button onClick={copySourceToImg2Img}>
              <ContentCopy />
            </Button>
          </GridItem>
          <GridItem xs={2}>
            <Button onClick={copySourceToInpaint}>
              <Brush />
            </Button>
          </GridItem>
          <GridItem xs={2}>
            <Button onClick={deleteImage}>
              <Delete />
            </Button>
          </GridItem>
        </Grid>
      </Box>
    </CardContent>
  </Card>;
}
