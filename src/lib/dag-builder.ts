import dagre from '@dagrejs/dagre';
import type { Edge } from '@xyflow/react';
import type {
  Project,
  DAGNodeStatus,
  ScriptNodeType,
  SceneNodeType,
  AssetNodeType,
  OutputNodeType,
} from './types';

const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;

type FlowNode = ScriptNodeType | SceneNodeType | AssetNodeType | OutputNodeType;
type FlowEdge = Edge<{ status: DAGNodeStatus }>;

export function buildDAGFromProject(project: Project): {
  nodes: FlowNode[];
  edges: FlowEdge[];
} {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 60 });

  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];

  // Layer 0: Script Input node
  const scriptNodeId = 'node_script';
  g.setNode(scriptNodeId, { width: NODE_WIDTH, height: NODE_HEIGHT });
  nodes.push({
    id: scriptNodeId,
    type: 'scriptNode',
    position: { x: 0, y: 0 },
    data: {
      label: 'Script Input',
      status: project.script ? 'complete' : 'pending',
      script: project.script,
    },
  });

  // Layer 1: Scene Split node
  const splitNodeId = 'node_split';
  g.setNode(splitNodeId, { width: NODE_WIDTH, height: NODE_HEIGHT });

  const splitStatus: DAGNodeStatus =
    project.scenes.length > 0
      ? 'complete'
      : project.script
        ? 'pending'
        : 'pending';

  const splitPipelineNode = project.pipeline.dag.find((n) => n.type === 'scene-split');
  nodes.push({
    id: splitNodeId,
    type: 'sceneNode',
    position: { x: 0, y: 0 },
    data: {
      label: 'Scene Split',
      status: splitPipelineNode?.status ?? splitStatus,
      sceneIndex: -1,
      description: `Gemini Flash → ${project.scenes.length || '?'} scenes`,
    },
  });

  edges.push({
    id: `edge_script_split`,
    source: scriptNodeId,
    target: splitNodeId,
    type: 'default',
    data: { status: splitPipelineNode?.status ?? 'pending' },
  });

  g.setEdge(scriptNodeId, splitNodeId);

  if (project.scenes.length === 0) {
    // No scenes yet: show placeholder scene nodes
    for (let i = 0; i < 3; i++) {
      const sceneId = `node_scene_placeholder_${i}`;
      g.setNode(sceneId, { width: NODE_WIDTH, height: NODE_HEIGHT });
      nodes.push({
        id: sceneId,
        type: 'sceneNode',
        position: { x: 0, y: 0 },
        data: {
          label: `Scene ${i + 1}`,
          status: 'pending',
          sceneIndex: i,
        },
      });
      edges.push({
        id: `edge_split_scene_${i}`,
        source: splitNodeId,
        target: sceneId,
        type: 'default',
        data: { status: 'pending' },
      });
      g.setEdge(splitNodeId, sceneId);
    }
  } else {
    // Real scenes
    for (const scene of project.scenes) {
      const sceneNodeId = `node_scene_${scene.sceneId}`;
      g.setNode(sceneNodeId, { width: NODE_WIDTH, height: NODE_HEIGHT });

      const sceneStatus = deriveSceneStatus(scene);
      nodes.push({
        id: sceneNodeId,
        type: 'sceneNode',
        position: { x: 0, y: 0 },
        data: {
          label: `Scene ${scene.index + 1}`,
          status: sceneStatus,
          sceneIndex: scene.index,
          description: scene.description,
        },
      });

      edges.push({
        id: `edge_split_scene_${scene.sceneId}`,
        source: splitNodeId,
        target: sceneNodeId,
        type: 'default',
        data: { status: sceneStatus },
      });
      g.setEdge(splitNodeId, sceneNodeId);

      // Image node
      const imgAsset = scene.assets.find((a) => a.type === 'image');
      const imgNodeId = `node_img_${scene.sceneId}`;
      g.setNode(imgNodeId, { width: NODE_WIDTH, height: NODE_HEIGHT });
      nodes.push({
        id: imgNodeId,
        type: 'assetNode',
        position: { x: 0, y: 0 },
        data: {
          label: 'Image',
          status: imgAsset?.status ?? 'pending',
          provider: imgAsset?.provider,
          cost: imgAsset?.cost,
          latencyMs: imgAsset?.latencyMs,
          prompt: imgAsset?.prompt ?? scene.imagePrompt,
          error: imgAsset?.error,
          assetType: 'image',
          sceneIndex: scene.index,
          assetId: imgAsset?.assetId,
        },
      });
      edges.push({
        id: `edge_scene_img_${scene.sceneId}`,
        source: sceneNodeId,
        target: imgNodeId,
        type: 'default',
        data: { status: imgAsset?.status ?? 'pending' },
      });
      g.setEdge(sceneNodeId, imgNodeId);

      // Voice node
      const voiceAsset = scene.assets.find((a) => a.type === 'voice');
      const voiceNodeId = `node_voice_${scene.sceneId}`;
      g.setNode(voiceNodeId, { width: NODE_WIDTH, height: NODE_HEIGHT });
      nodes.push({
        id: voiceNodeId,
        type: 'assetNode',
        position: { x: 0, y: 0 },
        data: {
          label: 'Voice',
          status: voiceAsset?.status ?? 'pending',
          provider: voiceAsset?.provider,
          cost: voiceAsset?.cost,
          latencyMs: voiceAsset?.latencyMs,
          prompt: voiceAsset?.prompt ?? scene.voiceScript,
          error: voiceAsset?.error,
          assetType: 'voice',
          sceneIndex: scene.index,
          assetId: voiceAsset?.assetId,
        },
      });
      edges.push({
        id: `edge_scene_voice_${scene.sceneId}`,
        source: sceneNodeId,
        target: voiceNodeId,
        type: 'default',
        data: { status: voiceAsset?.status ?? 'pending' },
      });
      g.setEdge(sceneNodeId, voiceNodeId);

      // Output node
      const outputNodeId = `node_output_${scene.sceneId}`;
      g.setNode(outputNodeId, { width: NODE_WIDTH, height: NODE_HEIGHT });
      const outputStatus = deriveOutputStatus(scene);
      nodes.push({
        id: outputNodeId,
        type: 'outputNode',
        position: { x: 0, y: 0 },
        data: {
          label: `Scene ${scene.index + 1} Ready`,
          status: outputStatus,
          sceneIndex: scene.index,
        },
      });
      edges.push({
        id: `edge_img_output_${scene.sceneId}`,
        source: imgNodeId,
        target: outputNodeId,
        type: 'default',
        data: { status: outputStatus },
      });
      edges.push({
        id: `edge_voice_output_${scene.sceneId}`,
        source: voiceNodeId,
        target: outputNodeId,
        type: 'default',
        data: { status: outputStatus },
      });
      g.setEdge(imgNodeId, outputNodeId);
      g.setEdge(voiceNodeId, outputNodeId);
    }
  }

  // Run dagre layout
  dagre.layout(g);

  // Apply positions from dagre
  for (const node of nodes) {
    const pos = g.node(node.id);
    if (pos) {
      node.position = {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      };
    }
  }

  return { nodes, edges };
}

function deriveSceneStatus(scene: { assets: { status: string }[] }): DAGNodeStatus {
  if (scene.assets.length === 0) return 'pending';
  if (scene.assets.some((a) => a.status === 'generating')) return 'generating';
  if (scene.assets.some((a) => a.status === 'failed')) return 'failed';
  if (scene.assets.every((a) => a.status === 'complete')) return 'complete';
  return 'pending';
}

function deriveOutputStatus(scene: { assets: { status: string; type: string }[] }): DAGNodeStatus {
  const image = scene.assets.find((a) => a.type === 'image');
  const voice = scene.assets.find((a) => a.type === 'voice');
  if (!image || !voice) return 'pending';
  if (image.status === 'complete' && voice.status === 'complete') return 'complete';
  if (image.status === 'failed' || voice.status === 'failed') return 'failed';
  if (image.status === 'generating' || voice.status === 'generating') return 'generating';
  return 'pending';
}

// Build a mock project for Phase 1 visual testing
export function buildMockProject(): Project {
  const makeAsset = (
    type: 'image' | 'voice',
    status: 'pending' | 'generating' | 'complete' | 'failed',
    sceneIdx: number
  ) => ({
    assetId: `asset_${type}_${sceneIdx}`,
    type: type as 'image' | 'voice',
    provider: type === 'image' ? 'hf-sdxl' : 'web-speech',
    status,
    cost: type === 'image' ? { credits: 40, usd: 0.04 } : { credits: 300, usd: 0.03 },
    latencyMs: type === 'image' ? 4200 : 1100,
    result: status === 'complete' ? `blob_proj_mock_asset_${type}_${sceneIdx}` : null,
    prompt: type === 'image' ? 'cinematic wide shot...' : 'narrator voice...',
  });

  const scenes = [
    {
      sceneId: 'scene_1',
      index: 0,
      description: 'Astronaut discovers mysterious signal on alien planet',
      imagePrompt: 'Cinematic wide shot, lone astronaut in orange spacesuit on red rocky alien planet, dramatic sunset, mysterious green signal beacon in distance',
      voiceScript: 'In the silence of a distant world, Commander Chen detected something that would change everything.',
      assets: [makeAsset('image', 'complete', 0), makeAsset('voice', 'complete', 0)],
    },
    {
      sceneId: 'scene_2',
      index: 1,
      description: 'Following the signal through alien ruins',
      imagePrompt: 'Dark alien ruins, ancient stone structures with glowing symbols, astronaut exploring with flashlight, atmospheric fog, mysterious',
      voiceScript: 'The signal led through crumbling ruins, each symbol telling a story older than human civilization.',
      assets: [makeAsset('image', 'generating', 1), makeAsset('voice', 'pending', 1)],
    },
    {
      sceneId: 'scene_3',
      index: 2,
      description: 'Hidden chamber containing proof of lost civilization',
      imagePrompt: 'Ancient underground chamber, crystalline holographic displays activated by astronaut presence, alien artifacts, golden light',
      voiceScript: 'The chamber revealed a truth humanity had long suspected but never dared believe.',
      assets: [makeAsset('image', 'failed', 2), makeAsset('voice', 'pending', 2)],
    },
  ];

  return {
    id: 'proj_mock',
    name: 'Demo: Space Discovery',
    script: 'A lone astronaut discovers a mysterious signal on a distant planet...',
    scenes,
    pipeline: {
      dag: [],
      edges: [],
      totalCost: { credits: 340, usd: 0.34 },
      startedAt: Date.now() - 30000,
    },
    createdAt: Date.now() - 60000,
    updatedAt: Date.now(),
    activeProvider: {
      image: 'hf-sdxl',
      voice: 'web-speech',
      sceneDecompose: 'gemini-flash',
    },
  };
}
