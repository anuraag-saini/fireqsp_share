import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Interaction {
  id: string
  mechanism: string
  source: string
  target: string
  interaction_type: 'positive' | 'negative' | 'regulatory' | 'binding' | 'transport'
  details: string
  confidence: 'high' | 'medium' | 'low'
  filename: string
  selected?: boolean
}

interface AppState {
  // Extraction data
  interactions: Interaction[]
  selectedInteractions: Interaction[]
  references: Record<string, string>
  
  // UI state
  currentStep: 'upload' | 'select' | 'diagram' | 'complete'
  
  // Diagram state
  diagramCode: string
  diagramData: {
    nodes: any[]
    edges: any[]
  } | null
  
  // Actions
  setExtractionResults: (data: {
    interactions: Interaction[]
    references: Record<string, string>
  }) => void
  updateInteraction: (id: string, updates: Partial<Interaction>) => void
  setSelectedInteractions: (interactions: Interaction[]) => void
  toggleInteractionSelection: (id: string) => void
  selectAllInteractions: () => void
  clearAllSelections: () => void
  setCurrentStep: (step: AppState['currentStep']) => void
  setDiagramCode: (code: string) => void
  setDiagramData: (data: AppState['diagramData']) => void
  clearAll: () => void
  
  // Statistics
  getStats: () => {
    total: number
    selected: number
    byType: Record<string, number>
    byConfidence: Record<string, number>
    byFile: Record<string, number>
  }
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      interactions: [],
      selectedInteractions: [],
      references: {},
      currentStep: 'upload',
      diagramCode: '',
      diagramData: null,
      
      // Actions
      setExtractionResults: (data) => {
        set({
          interactions: data.interactions.map(interaction => ({
            ...interaction,
            selected: false // Initialize with no selections
          })),
          references: data.references,
          currentStep: 'select',
          selectedInteractions: [],
          diagramCode: '',
          diagramData: null
        })
      },
      
      updateInteraction: (id, updates) => {
        set((state) => ({
          interactions: state.interactions.map(item =>
            item.id === id ? { ...item, ...updates } : item
          )
        }))
      },
      
      setSelectedInteractions: (selectedInteractions) => {
        set({ 
          selectedInteractions,
          currentStep: selectedInteractions.length > 0 ? 'diagram' : 'select'
        })
      },
      
      toggleInteractionSelection: (id) => {
        set((state) => {
          const updatedInteractions = state.interactions.map(item =>
            item.id === id ? { ...item, selected: !item.selected } : item
          )
          
          const selectedInteractions = updatedInteractions.filter(item => item.selected)
          
          return {
            interactions: updatedInteractions,
            selectedInteractions,
            currentStep: selectedInteractions.length > 0 ? 'diagram' : 'select'
          }
        })
      },
      
      selectAllInteractions: () => {
        set((state) => {
          const updatedInteractions = state.interactions.map(item => ({ 
            ...item, 
            selected: true 
          }))
          
          return {
            interactions: updatedInteractions,
            selectedInteractions: updatedInteractions,
            currentStep: 'diagram'
          }
        })
      },
      
      clearAllSelections: () => {
        set((state) => ({
          interactions: state.interactions.map(item => ({ 
            ...item, 
            selected: false 
          })),
          selectedInteractions: [],
          currentStep: 'select',
          diagramCode: '',
          diagramData: null
        }))
      },
      
      setCurrentStep: (currentStep) => {
        set({ currentStep })
      },
      
      setDiagramCode: (diagramCode) => {
        set({ diagramCode })
      },
      
      setDiagramData: (diagramData) => {
        set({ diagramData })
      },
      
      clearAll: () => {
        set({
          interactions: [],
          selectedInteractions: [],
          references: {},
          currentStep: 'upload',
          diagramCode: '',
          diagramData: null
        })
      },
      
      // Statistics computed function
      getStats: () => {
        const state = get()
        const total = state.interactions.length
        const selected = state.selectedInteractions.length
        
        const byType = state.interactions.reduce((acc, item) => {
          acc[item.interaction_type] = (acc[item.interaction_type] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        
        const byConfidence = state.interactions.reduce((acc, item) => {
          acc[item.confidence] = (acc[item.confidence] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        
        const byFile = state.interactions.reduce((acc, item) => {
          acc[item.filename] = (acc[item.filename] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        
        return { total, selected, byType, byConfidence, byFile }
      }
    }),
    {
      name: 'fireqsp-app-storage',
      partialize: (state) => ({
        interactions: state.interactions,
        selectedInteractions: state.selectedInteractions,
        references: state.references,
        currentStep: state.currentStep,
        diagramCode: state.diagramCode
      })
    }
  )
)