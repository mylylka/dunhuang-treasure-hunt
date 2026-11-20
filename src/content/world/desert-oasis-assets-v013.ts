import models from './desert-oasis-models-v013.json';

export interface OasisModelV013 {
  url: string;
  lodUrl: string;
  midUrl?: string;
  midTriangles?: number;
  width: number;
  height: number;
  depth: number;
  triangles: number;
  lodTriangles: number;
}

export function oasisModelV013(model: string): OasisModelV013 {
  const asset: OasisModelV013 | undefined = (models as Record<string, OasisModelV013>)[model];
  if (!asset) throw new Error('Unknown desert oasis model: ' + model);
  return asset;
}
