// Core data model for GenPM Pipeline Orchestrator

export type AssetType = 'image' | 'voice' | 'video';
export type AssetStatus = 'pending' | 'generating' | 'complete' | 'failed';
export type DAGNodeStatus = 'pending' | 'generating' | 'complete' | 'failed' | 'skipped';

export interface Cost {
  credits: number;
  usd: number;
}

export interface Asset {
  assetId: string;
  type: AssetType;
  provider: string;
  status: AssetStatus;
  cost: Cost;
  latencyMs: number;
  result: string | null; // IndexedDB key (blob ID) or null
  error?: string;
  prompt?: string;
}

export interface Scene {
  sceneId: string;
  index: number;
  description: string;
  imagePrompt: string;
  voiceScript: string;
  assets: Asset[];
}

export interface DAGNode {
  nodeId: string;
  type: 'script' | 'scene-split' | 'scene' | 'image' | 'voice' | 'output';
  label: string;
  status: DAGNodeStatus;
  provider?: string;
  cost?: Cost;
  latencyMs?: number;
  sceneIndex?: number;
  prompt?: string;
  error?: string;
}

export interface DAGEdge {
  edgeId: string;
  source: string;
  target: string;
  status: DAGNodeStatus;
}

export interface Pipeline {
  dag: DAGNode[];
  edges: DAGEdge[];
  totalCost: Cost;
  startedAt?: number;
  completedAt?: number;
}

export interface Project {
  id: string;
  name: string;
  script: string;
  scenes: Scene[];
  pipeline: Pipeline;
  createdAt: number;
  updatedAt: number;
  activeProvider: {
    image: string;
    voice: string;
    sceneDecompose: string;
  };
}

// Provider interface for ModelRouter
export interface ProviderConfig {
  name: string;
  type: AssetType | 'decompose';
  label: string;
  estimateCost: (prompt: string) => Cost;
  generate?: (prompt: string) => Promise<{ data: string; latencyMs: number }>;
}

// Cost tracking
export interface CostRecord {
  recordId: string;
  projectId: string;
  sceneId?: string;
  assetId?: string;
  provider: string;
  assetType: AssetType | 'decompose';
  actualCost: Cost;
  simulatedCost: Cost;
  timestamp: number;
  latencyMs: number;
}

// Storage types
export interface StoredBlob {
  id: string;
  projectId: string;
  assetId: string;
  blob: Blob;
  mimeType: string;
  createdAt: number;
}

// ReactFlow node data types (must extend Record<string, unknown> for @xyflow/react v12)
export interface ScriptNodeData extends Record<string, unknown> {
  label: string;
  status: DAGNodeStatus;
  script?: string;
}

export interface SceneNodeData extends Record<string, unknown> {
  label: string;
  status: DAGNodeStatus;
  sceneIndex: number;
  description?: string;
}

export interface AssetNodeData extends Record<string, unknown> {
  label: string;
  status: DAGNodeStatus;
  provider?: string;
  cost?: Cost;
  latencyMs?: number;
  prompt?: string;
  error?: string;
  assetType: AssetType;
  sceneIndex: number;
  assetId?: string;
}

export interface OutputNodeData extends Record<string, unknown> {
  label: string;
  status: DAGNodeStatus;
  sceneIndex: number;
}

// @xyflow/react v12 node type pattern
import type { Node } from '@xyflow/react';
export type ScriptNodeType = Node<ScriptNodeData, 'scriptNode'>;
export type SceneNodeType = Node<SceneNodeData, 'sceneNode'>;
export type AssetNodeType = Node<AssetNodeData, 'assetNode'>;
export type OutputNodeType = Node<OutputNodeData, 'outputNode'>;
