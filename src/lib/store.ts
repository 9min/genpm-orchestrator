import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, Scene, Asset, DAGNodeStatus, Cost } from './types';
import { FREE_PROVIDERS, MAX_PROJECTS } from './constants';

function makeEmptyPipeline() {
  return { dag: [], edges: [], totalCost: { credits: 0, usd: 0 } };
}

function makeProject(id: string, name: string): Project {
  return {
    id,
    name,
    script: '',
    scenes: [],
    pipeline: makeEmptyPipeline(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    activeProvider: { ...FREE_PROVIDERS },
  };
}

interface ProjectStore {
  projects: Project[];
  activeProjectId: string | null;

  // Project management
  createProject: (name: string) => Project;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string) => void;
  getActiveProject: () => Project | null;

  // Script + scenes
  setScript: (projectId: string, script: string) => void;
  setScenes: (projectId: string, scenes: Scene[]) => void;

  // Asset updates
  updateAssetStatus: (
    projectId: string,
    sceneId: string,
    assetId: string,
    status: Asset['status'],
    result?: string | null,
    latencyMs?: number,
    error?: string
  ) => void;

  // DAG node status
  updateDAGNodeStatus: (
    projectId: string,
    nodeId: string,
    status: DAGNodeStatus,
    cost?: Cost,
    latencyMs?: number,
    error?: string
  ) => void;

  // Provider selection
  setProvider: (
    projectId: string,
    type: keyof Project['activeProvider'],
    provider: string
  ) => void;

  // Total cost
  addCost: (projectId: string, cost: Cost) => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: [],
      activeProjectId: null,

      createProject: (name) => {
        const id = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const project = makeProject(id, name);
        set((state) => {
          const updated = [project, ...state.projects];
          // LRU: keep only MAX_PROJECTS
          const trimmed = updated.slice(0, MAX_PROJECTS);
          return { projects: trimmed, activeProjectId: id };
        });
        return project;
      },

      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          activeProjectId:
            state.activeProjectId === id ? null : state.activeProjectId,
        }));
        // Clean up IndexedDB blobs asynchronously
        import('./storage').then(({ deleteProjectBlobs }) => {
          deleteProjectBlobs(id).catch(() => {});
        });
      },

      setActiveProject: (id) => set({ activeProjectId: id }),

      getActiveProject: () => {
        const { projects, activeProjectId } = get();
        return projects.find((p) => p.id === activeProjectId) ?? null;
      },

      setScript: (projectId, script) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, script, updatedAt: Date.now() }
              : p
          ),
        }));
      },

      setScenes: (projectId, scenes) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, scenes, updatedAt: Date.now() }
              : p
          ),
        }));
      },

      updateAssetStatus: (projectId, sceneId, assetId, status, result, latencyMs, error) => {
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== projectId) return p;
            return {
              ...p,
              updatedAt: Date.now(),
              scenes: p.scenes.map((s) => {
                if (s.sceneId !== sceneId) return s;
                return {
                  ...s,
                  assets: s.assets.map((a) => {
                    if (a.assetId !== assetId) return a;
                    return {
                      ...a,
                      status,
                      ...(result !== undefined ? { result } : {}),
                      ...(latencyMs !== undefined ? { latencyMs } : {}),
                      ...(error !== undefined ? { error } : {}),
                    };
                  }),
                };
              }),
            };
          }),
        }));
      },

      updateDAGNodeStatus: (projectId, nodeId, status, cost, latencyMs, error) => {
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== projectId) return p;
            return {
              ...p,
              updatedAt: Date.now(),
              pipeline: {
                ...p.pipeline,
                dag: p.pipeline.dag.map((n) => {
                  if (n.nodeId !== nodeId) return n;
                  return {
                    ...n,
                    status,
                    ...(cost ? { cost } : {}),
                    ...(latencyMs !== undefined ? { latencyMs } : {}),
                    ...(error ? { error } : {}),
                  };
                }),
              },
            };
          }),
        }));
      },

      setProvider: (projectId, type, provider) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  activeProvider: { ...p.activeProvider, [type]: provider },
                  updatedAt: Date.now(),
                }
              : p
          ),
        }));
      },

      addCost: (projectId, cost) => {
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== projectId) return p;
            return {
              ...p,
              pipeline: {
                ...p.pipeline,
                totalCost: {
                  credits: p.pipeline.totalCost.credits + cost.credits,
                  usd: p.pipeline.totalCost.usd + cost.usd,
                },
              },
            };
          }),
        }));
      },
    }),
    {
      name: 'sceneforge-projects',
      // Only persist metadata, NOT asset results (those go in IndexedDB)
      partialize: (state) => ({
        projects: state.projects.map((p) => ({
          ...p,
          scenes: p.scenes.map((s) => ({
            ...s,
            assets: s.assets.map((a) => ({
              ...a,
              // Strip actual result data — only keep the ID reference
              result: a.result,
            })),
          })),
        })),
        activeProjectId: state.activeProjectId,
      }),
    }
  )
);
