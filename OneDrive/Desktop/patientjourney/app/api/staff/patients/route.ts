import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
  const authResult = await authenticateRequest(request, ['staff', 'admin'])
  
  if ('error' in authResult) {
    return authResult.error
  }

  const { user } = authResult
      const { searchParams } = new URL(request.url)
      const department = searchParams.get('department')
      const status = searchParams.get('status')
      const search = searchParams.get('search')?.trim() // Search by VN or HN
      const searchType = searchParams.get('searchType') || 'VN' // Search type: VN or HN
      const includeCompleted = searchParams.get('includeCompleted') === 'true' // Include completed when searching
      const dateFrom = searchParams.get('dateFrom') // Filter by date range (from)
      const dateTo = searchParams.get('dateTo') // Filter by date range (to)
      const statsOnly = searchParams.get('statsOnly') === 'true' // Return only statistics, not full patient data

      try {
        const where: any = {}

        // Admin sees all patients (all statuses)
        if (user.role === 'admin') {
          // Show all patients regardless of status
          if (status) {
            where.journeySteps = {
              some: {
                status: status,
              },
            }
          }
          console.log(`[Staff Patients API] Admin mode: showing all patients${status ? ` with status: ${status}` : ''}`)
        }
        // Filter by department if staff user
        else if (user.role === 'staff' && user.department) {
          console.log(`[Staff Patients API] Staff department: "${user.department}"`)
          
          // Find steps that match staff department (exact match) OR step name matches staff department
          const matchingSteps = await prisma.serviceStep.findMany({
            where: {
              OR: [
                { department: user.department, isActive: true },
                { name: user.department, isActive: true },
              ],
            },
            select: { id: true, name: true, department: true },
          })
          console.log(`[Staff Patients API] Found ${matchingSteps.length} service steps matching "${user.department}":`, matchingSteps.map(s => ({ name: s.name, department: s.department })))
          
          if (matchingSteps.length > 0) {
            const stepIds = matchingSteps.map(s => s.id)
            
            // By default, exclude completed patients (unless searching or includeCompleted=true)
            // When searching, show all statuses including completed
            const statusFilter: any = {}
            
            if (status) {
              // Explicit status filter provided
              statusFilter.status = status
            } else if (!includeCompleted && !search) {
              // Default: exclude completed (only show waiting/in_progress)
              statusFilter.status = { in: ['waiting', 'in_progress'] }
            }
            // If includeCompleted=true or search is provided, show all statuses (no status filter)
            
            where.journeySteps = {
              some: {
                stepId: { in: stepIds },
                ...statusFilter,
              },
            }
          } else {
            console.log(`[Staff Patients API] No matching steps found, returning empty list`)
            return NextResponse.json({ patients: [] })
          }
          
          console.log(`[Staff Patients API] Where clause:`, JSON.stringify(where, null, 2))
        }
        
        // Add search filter (by VN or HN) if provided
        if (search) {
          if (searchType === 'VN') {
            // Search by VN
            where.vn = {
              contains: search,
              mode: 'insensitive',
            }
          } else if (searchType === 'HN') {
            // Search by HN (need to compare with hashed HN)
            // Since HN is hashed, we need to find all visits first, then filter by comparing hashed HN
            // This is less efficient but necessary for security
            
            // Build base where clause without search filter
            const baseWhere: any = {}
            
            // Copy existing filters (department, date range, etc.) but exclude search
            if (user.role === 'admin') {
              // Admin: no department filter
              if (status) {
                baseWhere.journeySteps = {
                  some: {
                    status: status,
                  },
                }
              }
            } else if (user.role === 'staff' && user.department) {
              // Staff: filter by department
              const matchingSteps = await prisma.serviceStep.findMany({
                where: {
                  OR: [
                    { department: user.department, isActive: true },
                    { name: user.department, isActive: true },
                  ],
                },
                select: { id: true },
              })
              
              if (matchingSteps.length > 0) {
                const stepIds = matchingSteps.map(s => s.id)
                const statusFilter: any = {}
                
                if (status) {
                  statusFilter.status = status
                } else if (!includeCompleted) {
                  statusFilter.status = { in: ['waiting', 'in_progress'] }
                }
                
                baseWhere.journeySteps = {
                  some: {
                    stepId: { in: stepIds },
                    ...statusFilter,
                  },
                }
              } else {
                return NextResponse.json({ patients: [] })
              }
            }
            
            // Add date range filter if provided
            if (dateFrom || dateTo) {
              const dateFilter: any = {}
              if (dateFrom) {
                dateFilter.gte = new Date(dateFrom)
              }
              if (dateTo) {
                dateFilter.lte = new Date(dateTo)
              }
              baseWhere.startTime = dateFilter
            }
            
            // Fetch all visits matching base filters
            const allVisitsForHnSearch = await prisma.patientVisit.findMany({
              where: baseWhere,
              select: {
                id: true,
                hnHash: true,
              },
            })
            
            console.log(`[Staff Patients API] Found ${allVisitsForHnSearch.length} visits to check for HN: ${search}`)
            
            // Filter visits by comparing HN hash
            const matchingVisitIds: string[] = []
            for (const visit of allVisitsForHnSearch) {
              try {
                const isValid = await bcrypt.compare(search, visit.hnHash)
                if (isValid) {
                  matchingVisitIds.push(visit.id)
                }
              } catch (err) {
                // Skip if comparison fails
                console.error(`[Staff Patients API] Error comparing HN for visit ${visit.id}:`, err)
              }
            }
            
            console.log(`[Staff Patients API] Found ${matchingVisitIds.length} visits matching HN`)
            
            if (matchingVisitIds.length > 0) {
              where.id = { in: matchingVisitIds }
            } else {
              // No matches found, return empty result
              return NextResponse.json({ patients: [] })
            }
          }
        }

        // Add date range filter if provided (only if not searching by HN, as HN search already includes date filter)
        if ((dateFrom || dateTo) && searchType !== 'HN') {
          const dateFilter: any = {}
          if (dateFrom) {
            dateFilter.gte = new Date(dateFrom)
          }
          if (dateTo) {
            dateFilter.lte = new Date(dateTo)
          }
          where.startTime = dateFilter
        }

    // If statsOnly, optimize query to fetch minimal data
    const visits = await prisma.patientVisit.findMany({
      where,
      include: statsOnly ? {
        // For stats, only fetch minimal data needed for calculation
        journeySteps: {
          select: {
            id: true,
            status: true,
            stepId: true,
            step: {
              select: {
                id: true,
                name: true,
                department: true,
              },
            },
          },
          orderBy: {
            startTime: 'desc',
          },
        },
      } : {
        journeySteps: {
          include: {
            step: true,
          },
          orderBy: {
            startTime: 'desc',
          },
          // Get all journey steps for both admin and staff
        },
      },
      orderBy: {
        startTime: 'desc',
      },
      take: statsOnly ? 1000 : 50, // Allow more records for stats calculation
    })

    console.log(`[Staff Patients API] Found ${visits.length} visits`)
    
    // Debug: Check all visits and their journey steps
    const allVisits = await prisma.patientVisit.findMany({
      take: 10,
      include: {
        journeySteps: {
          include: {
            step: true,
          },
        },
      },
      orderBy: {
        startTime: 'desc',
      },
    })
    console.log(`[Staff Patients API] All visits in system: ${allVisits.length}`)
    allVisits.forEach((visit, index) => {
      console.log(`[Staff Patients API] All Visit ${index + 1}: VN=${visit.vn}, JourneySteps=${visit.journeySteps.length}`)
      visit.journeySteps.forEach((js, jsIndex) => {
        console.log(`[Staff Patients API]   All JourneyStep ${jsIndex + 1}: step="${js.step.name}", department="${js.step.department}", status=${js.status}`)
      })
    })
    
    visits.forEach((visit, index) => {
      console.log(`[Staff Patients API] Filtered Visit ${index + 1}: VN=${visit.vn}, JourneySteps=${visit.journeySteps.length}`)
      visit.journeySteps.forEach((js, jsIndex) => {
        console.log(`[Staff Patients API]   Filtered JourneyStep ${jsIndex + 1}: step="${js.step.name}", department="${js.step.department}", status=${js.status}`)
      })
    })

    const patients = visits.map((visit) => {
      // Get all journey steps for this visit (for history) - order by startTime ascending for proper timeline
      const allSteps = visit.journeySteps
        .sort((a, b) => {
          const aTime = (a as any).startTime ? new Date((a as any).startTime).getTime() : 0
          const bTime = (b as any).startTime ? new Date((b as any).startTime).getTime() : 0
          return aTime - bTime
        })
        .map(js => ({
          id: js.id,
          name: js.step.name,
          status: js.status,
          department: js.step.department,
          queueNumber: js.queueNumber,
          startTime: js.startTime,
          endTime: js.endTime,
          notes: js.notes,
        }))
      
      // For staff: Find step in their department
      // For admin: Find current step (waiting/in_progress) or latest
      let currentStep = null
      
      if (user.role === 'staff' && user.department) {
        // When searching, show completed steps too
        // When not searching, only show active steps (waiting/in_progress)
        if (includeCompleted || search) {
          // Show completed step if exists (for search results)
          const completedStepInDept = visit.journeySteps.find(js => 
            js.status === 'completed' && 
            (js.step.department === user.department || js.step.name === user.department)
          )
          if (completedStepInDept) {
            currentStep = completedStepInDept
          }
        }
        
        // Always try to find active step (waiting/in_progress) - this takes priority if exists
        const activeStepInDept = visit.journeySteps.find(js => 
          (js.status === 'in_progress' || js.status === 'waiting') &&
          (js.step.department === user.department || js.step.name === user.department)
        )
        if (activeStepInDept) {
          currentStep = activeStepInDept
        }
      } else {
        // Admin: Find current step (waiting/in_progress) or latest
        currentStep = visit.journeySteps.find(js => js.status === 'waiting' || js.status === 'in_progress') || visit.journeySteps[0] || null
      }
      
      return {
        vn: visit.vn,
        visitId: visit.id,
        currentStep: currentStep
          ? {
              id: currentStep.id,
              name: currentStep.step.name,
              status: currentStep.status,
              department: currentStep.step.department,
              queueNumber: currentStep.queueNumber,
              startTime: currentStep.startTime,
              endTime: currentStep.endTime,
              notes: currentStep.notes,
            }
          : null,
        allSteps, // Include all steps for history
        startTime: visit.startTime,
      }
    })
    
    // Filter out patients with only completed steps (when not searching)
    const filteredPatients = patients.filter(patient => {
      if (user.role === 'staff' && !includeCompleted && !search) {
        // Only show patients with active steps (waiting/in_progress) in staff's department
        return patient.currentStep && 
               (patient.currentStep.status === 'waiting' || patient.currentStep.status === 'in_progress')
      }
      // When searching or includeCompleted=true, show all patients
      return true
    })

    // If statsOnly is true, return only statistics (much faster for large datasets)
    if (statsOnly) {
      const stats = {
        total: filteredPatients.length,
        waiting: filteredPatients.filter(p => p.currentStep?.status === 'waiting').length,
        inProgress: filteredPatients.filter(p => p.currentStep?.status === 'in_progress').length,
      }
      return NextResponse.json({ stats })
    }

    return NextResponse.json({ patients: filteredPatients })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch patients' },
      { status: 500 }
    )
  }
}


