import { z } from 'zod'

// Authentication schemas
export const loginSchema = z.object({
  vn: z.string().min(1, 'VN is required'),
  hn: z.string().min(1, 'HN is required'),
})

export const staffLoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

// Patient visit schemas
export const createVisitSchema = z.object({
  vn: z.string().min(1),
  hn: z.string().min(1),
})

// Journey step schemas
export const updateStatusSchema = z.object({
  vn: z.string().min(1),
  status: z.enum(['waiting', 'in_progress', 'completed', 'skipped']),
  nextStepId: z.string().uuid().optional(),
  notes: z.string().optional(),
})

// Service step schemas (Admin)
export const createServiceStepSchema = z.object({
  name: z.string().min(1),
  nameEn: z.string().optional(),
  department: z.string().min(1),
  location: z.string().optional(),
  floor: z.number().int().optional(),
  estimatedMinutes: z.number().int().default(30),
  preparationText: z.string().optional(),
  preparationTextEn: z.string().optional(),
  nextSteps: z.array(z.string().uuid()).default([]),
  icon: z.string().optional(),
  color: z.string().optional(),
  displayOrder: z.number().int().optional(),
})

export const updateServiceStepSchema = createServiceStepSchema.partial()

// User schemas (Admin)
export const createUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(6),
  role: z.enum(['admin', 'staff', 'patient']),
  department: z.string().optional(),
  fullName: z.string().optional(),
  email: z.string().email().optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type StaffLoginInput = z.infer<typeof staffLoginSchema>
export type CreateVisitInput = z.infer<typeof createVisitSchema>
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>
export type CreateServiceStepInput = z.infer<typeof createServiceStepSchema>
export type UpdateServiceStepInput = z.infer<typeof updateServiceStepSchema>
export type CreateUserInput = z.infer<typeof createUserSchema>



