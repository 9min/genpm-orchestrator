'use client';

import pLimit from 'p-limit';
import type { Project, Scene, Asset } from './types';
import { decomposeScript } from './providers/gemini-flash';
import { generateImage } from './providers/hf-sdxl';
import { getFallbackImage } from './providers/fallback-image';
import { speakAndRecord } from './providers/web-speech';
import { saveBase64AsBlob } from './storage';
import { costTracker } from './cost-tracker';
import { modelRouter } from './model-router';

// Max concurrent HF API calls to avoid rate-limit 429s
const imageLimit = pLimit(3);

type StoreUpdater = {
  setScenes: (projectId: string, scenes: Scene[]) => void;
  updateAssetStatus: (
    projectId: string,
    sceneId: string,
    assetId: string,
    status: Asset['status'],
    result?: string | null,
    latencyMs?: number,
    error?: string
  ) => void;
  updateDAGNodeStatus: (
    projectId: string,
    nodeId: string,
    status: import('./types').DAGNodeStatus,
    cost?: import('./types').Cost,
    latencyMs?: number,
    error?: string
  ) => void;
  addCost: (projectId: string, cost: import('./types').Cost) => void;
};

export async function runSceneDecompose(
  project: Project,
  store: StoreUpdater
): Promise<Scene[]> {
  const { id: projectId, script, activeProvider } = project;

  store.updateDAGNodeStatus(projectId, 'node_split', 'generating');

  const { scenes: rawScenes, latencyMs } = await decomposeScript(script);

  const provider = modelRouter.resolve(activeProvider.sceneDecompose);
  const cost = provider.estimateCost(script);

  costTracker.record({
    projectId,
    provider: activeProvider.sceneDecompose,
    assetType: 'decompose',
    actualCost: { credits: 0, usd: 0 },
    simulatedCost: cost,
    prompt: script,
    latencyMs,
  });

  store.addCost(projectId, cost);
  store.updateDAGNodeStatus(projectId, 'node_split', 'complete', cost, latencyMs);

  const scenes: Scene[] = rawScenes.map((raw, index) => ({
    sceneId: `scene_${projectId}_${index}`,
    index,
    description: raw.description,
    imagePrompt: raw.imagePrompt,
    voiceScript: raw.voiceScript,
    assets: [
      {
        assetId: `asset_img_${projectId}_${index}`,
        type: 'image' as const,
        provider: activeProvider.image,
        status: 'pending' as const,
        cost: { credits: 0, usd: 0 },
        latencyMs: 0,
        result: null,
        prompt: raw.imagePrompt,
      },
      {
        assetId: `asset_voice_${projectId}_${index}`,
        type: 'voice' as const,
        provider: activeProvider.voice,
        status: 'pending' as const,
        cost: { credits: 0, usd: 0 },
        latencyMs: 0,
        result: null,
        prompt: raw.voiceScript,
      },
    ],
  }));

  store.setScenes(projectId, scenes);
  return scenes;
}

export async function generateSceneAssets(
  project: Project,
  scene: Scene,
  store: StoreUpdater
): Promise<void> {
  const { id: projectId } = project;
  const imgAsset = scene.assets.find((a) => a.type === 'image')!;
  const voiceAsset = scene.assets.find((a) => a.type === 'voice')!;

  // Run image (rate-limited) and voice in parallel
  await Promise.allSettled([
    imageLimit(() => generateImageAsset(projectId, scene, imgAsset, store)),
    generateVoiceAsset(projectId, scene, voiceAsset, store),
  ]);
}

async function generateImageAsset(
  projectId: string,
  scene: Scene,
  asset: Asset,
  store: StoreUpdater
): Promise<void> {
  store.updateAssetStatus(projectId, scene.sceneId, asset.assetId, 'generating');
  store.updateDAGNodeStatus(projectId, `node_img_${scene.sceneId}`, 'generating');

  try {
    let base64: string;
    let mimeType: string;
    let latencyMs: number;
    let usedFallback = false;

    try {
      const result = await generateImage(asset.prompt ?? scene.imagePrompt);
      base64 = result.base64;
      mimeType = result.mimeType;
      latencyMs = result.latencyMs;
    } catch (err) {
      // HF failed — use fallback preset image
      console.warn('Image generation failed, using fallback:', err);
      const fallback = await getFallbackImage(scene.index);
      base64 = fallback.base64;
      mimeType = fallback.mimeType;
      latencyMs = fallback.latencyMs;
      usedFallback = true;
    }

    // Save to IndexedDB, only keep blob ID in store
    const blobId = await saveBase64AsBlob(projectId, asset.assetId, base64, mimeType);

    const provider = modelRouter.resolve(usedFallback ? 'fallback-image' : asset.provider);
    const cost = provider.estimateCost(asset.prompt ?? scene.imagePrompt);

    costTracker.record({
      projectId,
      sceneId: scene.sceneId,
      assetId: asset.assetId,
      provider: usedFallback ? 'fallback-image' : asset.provider,
      assetType: 'image',
      actualCost: { credits: 0, usd: 0 },
      simulatedCost: cost,
      prompt: asset.prompt ?? scene.imagePrompt,
      latencyMs,
    });

    store.addCost(projectId, cost);
    store.updateAssetStatus(projectId, scene.sceneId, asset.assetId, 'complete', blobId, latencyMs);
    store.updateDAGNodeStatus(projectId, `node_img_${scene.sceneId}`, 'complete', cost, latencyMs);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    store.updateAssetStatus(projectId, scene.sceneId, asset.assetId, 'failed', null, 0, msg);
    store.updateDAGNodeStatus(projectId, `node_img_${scene.sceneId}`, 'failed', undefined, 0, msg);
  }
}

async function generateVoiceAsset(
  projectId: string,
  scene: Scene,
  asset: Asset,
  store: StoreUpdater
): Promise<void> {
  store.updateAssetStatus(projectId, scene.sceneId, asset.assetId, 'generating');
  store.updateDAGNodeStatus(projectId, `node_voice_${scene.sceneId}`, 'generating');

  try {
    const text = asset.prompt ?? scene.voiceScript;
    const start = Date.now();
    const { blob, latencyMs } = await speakAndRecord(text);
    const elapsed = latencyMs || Date.now() - start;

    const provider = modelRouter.resolve(asset.provider);
    const cost = provider.estimateCost(text);

    costTracker.record({
      projectId,
      sceneId: scene.sceneId,
      assetId: asset.assetId,
      provider: asset.provider,
      assetType: 'voice',
      actualCost: { credits: 0, usd: 0 },
      simulatedCost: cost,
      prompt: text,
      latencyMs: elapsed,
    });

    store.addCost(projectId, cost);

    let blobId: string | null = null;
    if (blob) {
      const { saveAssetBlob } = await import('./storage');
      blobId = await saveAssetBlob(projectId, asset.assetId, blob, 'audio/webm');
    }

    store.updateAssetStatus(projectId, scene.sceneId, asset.assetId, 'complete', blobId, elapsed);
    store.updateDAGNodeStatus(projectId, `node_voice_${scene.sceneId}`, 'complete', cost, elapsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    store.updateAssetStatus(projectId, scene.sceneId, asset.assetId, 'failed', null, 0, msg);
    store.updateDAGNodeStatus(projectId, `node_voice_${scene.sceneId}`, 'failed', undefined, 0, msg);
  }
}
