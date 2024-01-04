import { RetryParams } from './api.js';
import { BaseImgParams, HighresParams, Img2ImgParams, InpaintParams, Txt2ImgParams, UpscaleParams } from './params.js';

export interface Progress {
  current: number;
  total: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface NetworkMetadata {
  name: string;
  hash: string;
  weight: number;
}

export interface ImageMetadata<TParams extends BaseImgParams, TType extends JobType> {
  input_size: Size;
  outputs: Array<string>;
  params: TParams;

  inversions: Array<NetworkMetadata>;
  loras: Array<NetworkMetadata>;
  models: Array<NetworkMetadata>;

  border: unknown; // TODO: type
  highres: HighresParams;
  upscale: UpscaleParams;
  size: Size;

  type: TType;
}

export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  UNKNOWN = 'unknown',
}

export enum JobType {
  TXT2IMG = 'txt2img',
  IMG2IMG = 'img2img',
  INPAINT = 'inpaint',
  UPSCALE = 'upscale',
  BLEND = 'blend',
  CHAIN = 'chain',
}

export interface BaseJobResponse {
  name: string;
  status: JobStatus;
  type: JobType;

  stages: Progress;
  steps: Progress;
  tiles: Progress;
}

export interface CancelledJobResponse extends BaseJobResponse {
  status: JobStatus.CANCELLED;

  /**
   * Error message to indicate if the job was cancelled by a client, admin, or the server.
   */
  reason: string;
}

export interface UnknownJobResponse extends BaseJobResponse {
  status: JobStatus.UNKNOWN;

  /**
   * Error message to indicate why the job was marked as unknown, if there are extenuating circumstances.
   */
  reason: string;
}

/**
 * Pending image job.
 */
export interface PendingJobResponse extends BaseJobResponse {
  status: JobStatus.PENDING;
  queue: Progress;
}

export interface RunningJobResponse extends BaseJobResponse {
  status: JobStatus.RUNNING;
}

/**
 * Failed image job with error information.
 */
export interface FailedJobResponse extends BaseJobResponse {
  status: JobStatus.FAILED;
  error: string;
}

/**
 * Successful txt2img image job with output keys and metadata.
 */
export interface SuccessTxt2ImgJobResponse extends BaseJobResponse {
  status: JobStatus.SUCCESS;
  type: JobType.TXT2IMG;
  outputs: Array<string>;
  metadata: Array<ImageMetadata<Txt2ImgParams, JobType.TXT2IMG>>;
}

/**
 * Successful img2img job with output keys and metadata.
 */
export interface SuccessImg2ImgJobResponse extends BaseJobResponse {
  status: JobStatus.SUCCESS;
  type: JobType.IMG2IMG;
  outputs: Array<string>;
  metadata: Array<ImageMetadata<Img2ImgParams, JobType.IMG2IMG>>;
}

/**
 * Successful inpaint job with output keys and metadata.
 */
export interface SuccessInpaintJobResponse extends BaseJobResponse {
  status: JobStatus.SUCCESS;
  type: JobType.INPAINT;
  outputs: Array<string>;
  metadata: Array<ImageMetadata<InpaintParams, JobType.INPAINT>>;
}

/**
 * Successful upscale job with output keys and metadata.
 */
export interface SuccessUpscaleJobResponse extends BaseJobResponse {
  status: JobStatus.SUCCESS;
  type: JobType.UPSCALE;
  outputs: Array<string>;
  metadata: Array<ImageMetadata<BaseImgParams, JobType.UPSCALE>>;
}

/**
 * Successful blend job with output keys and metadata.
 */
export interface SuccessBlendJobResponse extends BaseJobResponse {
  status: JobStatus.SUCCESS;
  type: JobType.BLEND;
  outputs: Array<string>;
  metadata: Array<ImageMetadata<BaseImgParams, JobType.BLEND>>;
}

/**
 * Successful chain pipeline job with output keys and metadata.
 */
export interface SuccessChainJobResponse extends BaseJobResponse {
  status: JobStatus.SUCCESS;
  type: JobType.CHAIN;
  outputs: Array<string>;
  metadata: Array<ImageMetadata<BaseImgParams, JobType>>; // TODO: could be all kinds
}

export type SuccessJobResponse
  = SuccessTxt2ImgJobResponse
  | SuccessImg2ImgJobResponse
  | SuccessInpaintJobResponse
  | SuccessUpscaleJobResponse
  | SuccessBlendJobResponse
  | SuccessChainJobResponse;

export type JobResponse
  = CancelledJobResponse
  | PendingJobResponse
  | RunningJobResponse
  | FailedJobResponse
  | SuccessJobResponse
  | UnknownJobResponse;

/**
 * Status response from the job endpoint, with parameters to retry the job if it fails.
 */
export interface JobResponseWithRetry {
  job: JobResponse;
  retry: RetryParams;
}

/**
 * Re-export `RetryParams` for convenience.
 */
export { RetryParams };
