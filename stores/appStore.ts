import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Simple, clean interaction interface - no more nested object confusion!
interface Interaction {
  id: string
  mechanism: string
  source: { name: string, level: string }  // Keep nested structure
  target: { name: string, level: string }  // Keep nested structure
  interaction_type: string
  details: string
  confidence: string
  filename: string
  selected?: boolean
}

interface AppState {
  // Core data
  interactions: Interaction[]
  selectedInteractions: Interaction[]  // Keep this for navigation between steps
  references: Record<string, string>
  
  // Simple UI state
  currentStep: 'upload' | 'select' | 'diagram'
  
  // Actions
  setExtractionResults: (data: {
    interactions: Interaction[]
    references: Record<string, string>
  }) => void
  
  toggleInteractionSelection: (id: string) => void
  selectAllInteractions: () => void
  clearAllSelections: () => void
  setCurrentStep: (step: AppState['currentStep']) => void
  clearAll: () => void
  
  // Get selected interactions (computed)
  getSelectedInteractions: () => Interaction[]
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      interactions: [],
      selectedInteractions: [],
      references: {},
      currentStep: 'upload',
      
      // Actions
      setExtractionResults: (data) => {
        console.log('AppStore: Setting extraction results:', data)
        
        // Clean and simple - no complex transformations!
        const interactions = (data.interactions || []).map((item, index): Interaction => ({
          id: item.id || `interaction_${index}`,
          mechanism: item.mechanism || '',
          source: item.source || { name: 'Unknown', level: 'Unknown' },
          target: item.target || { name: 'Unknown', level: 'Unknown' },
          interaction_type: item.interaction_type || 'binding',
          details: item.details || '',
          confidence: item.confidence || 'medium',
          filename: item.filename || '',
          selected: false
        }))
        
        console.log('AppStore: Processed interactions:', interactions.length)
        
        set({
          interactions,
          references: data.references || {},
          currentStep: interactions.length > 0 ? 'select' : 'upload'
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
            selectedInteractions
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
            selectedInteractions: updatedInteractions
          }
        })
      },
      
      clearAllSelections: () => {
        set((state) => ({
          interactions: state.interactions.map(item => ({ 
            ...item, 
            selected: false 
          })),
          selectedInteractions: []
        }))
      },
      
      setCurrentStep: (currentStep) => {
        console.log('AppStore: Setting current step:', currentStep)
        set({ currentStep })
      },
      
      clearAll: () => {
        console.log('AppStore: Clearing all data')
        set({
          interactions: [],
          selectedInteractions: [],
          references: {},
          currentStep: 'upload'
        })
      },
      
      // Computed function to get selected interactions
      getSelectedInteractions: () => {
        return get().interactions.filter(item => item.selected)
      }
    }),
    {
      name: 'fireqsp-app-storage',
      partialize: (state) => ({
        interactions: state.interactions,
        selectedInteractions: state.selectedInteractions,  // Keep this for navigation
        references: state.references,
        currentStep: state.currentStep
      })
    }
  )
)