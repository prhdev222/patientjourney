// Type definitions for the application

export interface PatientVisit {
  id: string
  vn: string
  startTime: Date
  endTime?: Date
  currentStepId?: string
}

export interface ServiceStep {
  id: string
  name: string
  nameEn?: string
  department: string
  location?: string
  floor?: number
  estimatedMinutes: number
  preparationText?: string
  preparationTextEn?: string
  nextSteps: string[]
  icon?: string
  color?: string
  isActive: boolean
  displayOrder?: number
}

export interface JourneyStep {
  id: string
  visitId: string
  stepId: string
  startTime: Date
  endTime?: Date
  status: 'waiting' | 'in_progress' | 'completed' | 'skipped'
  queueNumber?: number
  notes?: string
  updatedById?: string
}

export interface User {
  id: string
  username: string
  role: 'admin' | 'staff' | 'patient'
  department?: string
  fullName?: string
  email?: string
  isActive: boolean
  canAddPatients?: boolean
}





