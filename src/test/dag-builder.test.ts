import { describe, it, expect } from 'vitest';
import { buildDAGFromProject, buildMockProject } from '@/lib/dag-builder';
import type { Project, Scene } from '@/lib/types';

function makeEmptyProject(overrides?: Partial<Project>): Project {
  return {
    id: 'proj_test',
    name: 'Test',
    script: '',
    scenes: [],
    pipeline: { dag: [], edges: [], totalCost: { credits: 0, usd: 0 } },
    createdAt: 0,
    updatedAt: 0,
    activeProvider: { image: 'hf-sdxl', voice: 'web-speech', sceneDecompose: 'gemini-flash' },
    ...overrides,
  };
}

function makeScene(index: number, imageStatus: string = 'pending', voiceStatus: string = 'pending'): Scene {
  return {
    sceneId: `scene_${index}`,
    index,
    description: `Scene ${index}`,
    imagePrompt: 'test prompt',
    voiceScript: 'test script',
    assets: [
      { assetId: `img_${index}`, type: 'image', provider: 'hf-sdxl', status: imageStatus as Scene['assets'][0]['status'], cost: { credits: 0, usd: 0 }, latencyMs: 0, result: null },
      { assetId: `voice_${index}`, type: 'voice', provider: 'web-speech', status: voiceStatus as Scene['assets'][0]['status'], cost: { credits: 0, usd: 0 }, latencyMs: 0, result: null },
    ],
  };
}

describe('buildDAGFromProject', () => {
  it('0 scenes → placeholder 3 scene nodes + script + split = 5 nodes', () => {
    const project = makeEmptyProject();
    const { nodes } = buildDAGFromProject(project);
    // script + split + 3 placeholders = 5
    expect(nodes).toHaveLength(5);
    expect(nodes.filter(n => n.id === 'node_script')).toHaveLength(1);
    expect(nodes.filter(n => n.id === 'node_split')).toHaveLength(1);
    expect(nodes.filter(n => n.id.startsWith('node_scene_placeholder'))).toHaveLength(3);
  });

  it('0 scenes → 4 edges (script→split + 3 placeholder edges)', () => {
    const project = makeEmptyProject();
    const { edges } = buildDAGFromProject(project);
    expect(edges).toHaveLength(4);
  });

  it('3 scenes → correct node count', () => {
    // Per scene: sceneNode + imgNode + voiceNode + outputNode = 4
    // Plus script + split = 2
    // Total = 2 + 3*4 = 14
    const scenes = [makeScene(0), makeScene(1), makeScene(2)];
    const { nodes } = buildDAGFromProject(makeEmptyProject({ scenes }));
    expect(nodes).toHaveLength(14);
  });

  it('3 scenes → correct edge count', () => {
    // Per scene: split→scene + scene→img + scene→voice + img→output + voice→output = 5
    // Plus script→split = 1
    // Total = 1 + 3*5 = 16
    const scenes = [makeScene(0), makeScene(1), makeScene(2)];
    const { edges } = buildDAGFromProject(makeEmptyProject({ scenes }));
    expect(edges).toHaveLength(16);
  });

  it('all nodes have non-zero positions after dagre layout', () => {
    const scenes = [makeScene(0), makeScene(1)];
    const { nodes } = buildDAGFromProject(makeEmptyProject({ scenes }));
    for (const node of nodes) {
      expect(typeof node.position.x).toBe('number');
      expect(typeof node.position.y).toBe('number');
    }
  });

  it('script node status is complete when script is non-empty', () => {
    const { nodes } = buildDAGFromProject(makeEmptyProject({ script: 'hello' }));
    const scriptNode = nodes.find(n => n.id === 'node_script');
    expect(scriptNode?.data.status).toBe('complete');
  });

  it('script node status is pending when script is empty', () => {
    const { nodes } = buildDAGFromProject(makeEmptyProject());
    const scriptNode = nodes.find(n => n.id === 'node_script');
    expect(scriptNode?.data.status).toBe('pending');
  });

  it('failed image asset → output node status is failed', () => {
    const scenes = [makeScene(0, 'failed', 'complete')];
    const { nodes } = buildDAGFromProject(makeEmptyProject({ scenes }));
    const outputNode = nodes.find(n => n.id === 'node_output_scene_0');
    expect(outputNode?.data.status).toBe('failed');
  });

  it('both assets complete → output node status is complete', () => {
    const scenes = [makeScene(0, 'complete', 'complete')];
    const { nodes } = buildDAGFromProject(makeEmptyProject({ scenes }));
    const outputNode = nodes.find(n => n.id === 'node_output_scene_0');
    expect(outputNode?.data.status).toBe('complete');
  });

  it('generating asset → scene node status is generating', () => {
    const scenes = [makeScene(0, 'generating', 'pending')];
    const { nodes } = buildDAGFromProject(makeEmptyProject({ scenes }));
    const sceneNode = nodes.find(n => n.id === 'node_scene_scene_0');
    expect(sceneNode?.data.status).toBe('generating');
  });

  it('buildMockProject produces valid project', () => {
    const mock = buildMockProject();
    expect(mock.id).toBe('proj_mock');
    expect(mock.scenes).toHaveLength(3);
    const { nodes, edges } = buildDAGFromProject(mock);
    expect(nodes.length).toBeGreaterThan(0);
    expect(edges.length).toBeGreaterThan(0);
  });
});
