import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Project } from '../types';

interface ProjectStore {
  currentProject: Project | null;
  projects: Project[];
  setCurrentProject: (project: Project | null) => void;
  setProjects: (projects: Project[]) => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      currentProject: null,
      projects: [],
      setCurrentProject: (project) => set({ currentProject: project }),
      setProjects: (projects) => set({ projects }),
    }),
    {
      name: 'agri-project',
      partialize: (state) => ({ currentProject: state.currentProject }),
    }
  )
);
