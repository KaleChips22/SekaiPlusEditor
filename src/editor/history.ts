import { Note } from './note'

export interface HistoryState {
  notes: Note[]
  timestamp: number
}

class HistoryManager {
  private undoStack: HistoryState[] = []
  private redoStack: HistoryState[] = []
  private maxHistorySize = 100
  private isUndoRedoOperation = false

  /**
   * Save the current state to the undo stack
   */
  saveState(notes: Note[]): void {
    // Don't save state if we're performing an undo/redo operation
    if (this.isUndoRedoOperation) return

    // Deep clone the notes array to prevent reference issues
    const clonedNotes = this.deepClone(notes)

    const state: HistoryState = {
      notes: clonedNotes,
      timestamp: Date.now(),
    }

    this.undoStack.push(state)

    // Clear redo stack when a new action is performed
    this.redoStack = []

    // Limit the size of the undo stack
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift()
    }
  }

  /**
   * Undo the last action
   * Returns the previous state or null if no undo is available
   */
  undo(currentNotes: Note[]): Note[] | null {
    if (this.undoStack.length === 0) {
      console.log('Nothing to undo')
      return null
    }

    // Save current state to redo stack
    const currentState: HistoryState = {
      notes: this.deepClone(currentNotes),
      timestamp: Date.now(),
    }
    this.redoStack.push(currentState)

    // Get previous state from undo stack
    const previousState = this.undoStack.pop()!

    this.isUndoRedoOperation = true
    const restoredNotes = this.deepClone(previousState.notes)
    this.isUndoRedoOperation = false

    return restoredNotes
  }

  /**
   * Redo the last undone action
   * Returns the next state or null if no redo is available
   */
  redo(currentNotes: Note[]): Note[] | null {
    if (this.redoStack.length === 0) {
      console.log('Nothing to redo')
      return null
    }

    // Save current state to undo stack
    const currentState: HistoryState = {
      notes: this.deepClone(currentNotes),
      timestamp: Date.now(),
    }
    this.undoStack.push(currentState)

    // Get next state from redo stack
    const nextState = this.redoStack.pop()!

    this.isUndoRedoOperation = true
    const restoredNotes = this.deepClone(nextState.notes)
    this.isUndoRedoOperation = false

    return restoredNotes
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.undoStack = []
    this.redoStack = []
  }

  /**
   * Get the number of available undo operations
   */
  getUndoCount(): number {
    return this.undoStack.length
  }

  /**
   * Get the number of available redo operations
   */
  getRedoCount(): number {
    return this.redoStack.length
  }

  /**
   * Deep clone notes array to prevent reference issues
   * This handles the complex linked structure of hold notes
   */
  private deepClone(notes: Note[]): Note[] {
    // First pass: clone all notes without references
    const clonedNotes = notes.map((note) => {
      const cloned = { ...note }

      // Remove references temporarily
      if ('nextNode' in cloned) {
        delete (cloned as Record<string, unknown>).nextNode
      }
      if ('prevNode' in cloned) {
        delete (cloned as Record<string, unknown>).prevNode
      }

      return cloned
    })

    // Second pass: restore references using indices
    notes.forEach((originalNote, index) => {
      const clonedNote = clonedNotes[index] as Record<string, unknown>

      if ('nextNode' in originalNote && originalNote.nextNode) {
        const nextIndex = notes.indexOf(originalNote.nextNode as Note)
        if (nextIndex !== -1) {
          clonedNote.nextNode = clonedNotes[nextIndex]
        }
      }

      if ('prevNode' in originalNote && originalNote.prevNode) {
        const prevIndex = notes.indexOf(originalNote.prevNode as Note)
        if (prevIndex !== -1) {
          clonedNote.prevNode = clonedNotes[prevIndex]
        }
      }
    })

    return clonedNotes
  }

  /**
   * Set the maximum history size
   */
  setMaxHistorySize(size: number): void {
    this.maxHistorySize = Math.max(1, size)

    // Trim undo stack if necessary
    while (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift()
    }
  }

  /**
   * Get a summary of the history state for debugging
   */
  getHistorySummary(): string {
    return `Undo: ${this.undoStack.length} | Redo: ${this.redoStack.length}`
  }
}

// Export a singleton instance
export const historyManager = new HistoryManager()
