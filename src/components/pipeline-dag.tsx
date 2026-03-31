'use client';

import { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ScriptNode } from '@/components/dag-nodes/script-node';
import { SceneNode } from '@/components/dag-nodes/scene-node';
import { AssetNode } from '@/components/dag-nodes/asset-node';
import { OutputNode } from '@/components/dag-nodes/output-node';
import { buildDAGFromProject } from '@/lib/dag-builder';
import type { Project, DAGNodeStatus } from '@/lib/types';

const nodeTypes: NodeTypes = {
  scriptNode: ScriptNode as NodeTypes[string],
  sceneNode: SceneNode as NodeTypes[string],
  assetNode: AssetNode as NodeTypes[string],
  outputNode: OutputNode as NodeTypes[string],
};

const edgeStyle = (status: DAGNodeStatus) => {
  switch (status) {
    case 'complete':
      return { stroke: '#22c55e', strokeWidth: 2 };
    case 'generating':
      return { stroke: '#eab308', strokeWidth: 2, strokeDasharray: '5,5' };
    case 'failed':
      return { stroke: '#ef4444', strokeWidth: 2 };
    default:
      return { stroke: '#4b5563', strokeWidth: 1.5, strokeDasharray: '4,4' };
  }
};

interface PipelineDAGProps {
  project: Project;
}

export function PipelineDAG({ project }: PipelineDAGProps) {
  const { nodes: builtNodes, edges: builtEdges } = useMemo(
    () => buildDAGFromProject(project),
    // Rebuild when scene count or any asset status changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      project.id,
      project.scenes.length,
      project.pipeline.dag.length,
      // Track asset statuses so DAG updates during generation
      project.scenes.map((s) => s.assets.map((a) => a.status).join(',')).join('|'),
    ]
  );

  const styledEdges = useMemo(
    () =>
      builtEdges.map((edge) => ({
        ...edge,
        style: edgeStyle((edge.data?.status as DAGNodeStatus | undefined) ?? 'pending'),
        animated: edge.data?.status === 'generating',
      })),
    [builtEdges]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [nodes, setNodes, onNodesChange] = useNodesState(builtNodes as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [edges, setEdges, onEdgesChange] = useEdgesState(styledEdges as any);

  // Sync external changes (store updates) into ReactFlow state
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setNodes(builtNodes as any);
  }, [builtNodes, setNodes]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setEdges(styledEdges as any);
  }, [styledEdges, setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: { id: string; data: unknown }) => {
    console.log('Node clicked:', node.id, node.data);
  }, []);

  return (
    <div className="w-full h-full bg-gray-950 rounded-lg overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onNodeClick={onNodeClick as any}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1f2937" gap={20} />
        <Controls className="!bg-gray-800 !border-gray-700 !text-gray-200" />
        <MiniMap
          className="!bg-gray-900 !border-gray-700"
          nodeColor={(node) => {
            const status = (node.data as { status?: DAGNodeStatus })?.status;
            switch (status) {
              case 'complete': return '#22c55e';
              case 'generating': return '#eab308';
              case 'failed': return '#ef4444';
              default: return '#4b5563';
            }
          }}
        />
      </ReactFlow>
    </div>
  );
}
