import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pb, type Submission } from '@/lib/pb'
import { toast } from 'sonner'

// Query key factory
export const submissionKeys = {
  all: ['submissions'] as const,
  lists: () => [...submissionKeys.all, 'list'] as const,
  list: (filters?: Record<string, any>) => [...submissionKeys.lists(), filters] as const,
}

// Fetch all submissions
export function useSubmissions() {
  return useQuery({
    queryKey: submissionKeys.lists(),
    queryFn: async () => {
      console.log('🔍 Fetching submissions...')
      const records = await pb.collection('submissions').getFullList<Submission>({
        sort: '-updated',
        expand: 'created_by,approved_by',
        requestKey: null,
      })
      
      console.log('📊 Fetched submissions:', records.length)
      if (records.length > 0) {
        console.log('📋 First submission sample:', records[0])
        console.log('👤 First submission created_by field:', records[0].created_by)
        console.log('🔗 First submission expand data:', (records[0] as any).expand)
      }
      
      return records
    },
  })
}

// Approve submission mutation
export function useApproveSubmission() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (submissionId: string) => {
      return await pb.collection('submissions').update(submissionId, {
        status: 'approved',
        approved_by: pb.authStore.record?.id || ''
      }, {
        requestKey: null
      })
    },
    onSuccess: (data) => {
      // Invalidate and refetch submissions
      queryClient.invalidateQueries({ queryKey: submissionKeys.lists() })
      
      toast.success("Submission approved", {
        description: "The submission has been approved successfully",
      })
    },
    onError: (error: any) => {
      console.error("Error approving submission:", error)
      if (!error.message?.includes('autocancelled') && !error.name?.includes('AbortError')) {
        toast.error("Failed to approve submission", {
          description: error.message || "An error occurred",
        })
      }
    },
  })
}

// Reject submission mutation
export function useRejectSubmission() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (submissionId: string) => {
      return await pb.collection('submissions').update(submissionId, {
        status: 'rejected',
        approved_by: pb.authStore.record?.id || ''
      }, {
        requestKey: null
      })
    },
    onSuccess: () => {
      // Invalidate and refetch submissions
      queryClient.invalidateQueries({ queryKey: submissionKeys.lists() })
      
      toast.success("Submission rejected", {
        description: "The submission has been rejected",
      })
    },
    onError: (error: any) => {
      console.error("Error rejecting submission:", error)
      if (!error.message?.includes('autocancelled') && !error.name?.includes('AbortError')) {
        toast.error("Failed to reject submission", {
          description: error.message || "An error occurred",
        })
      }
    },
  })
}

// Check authentication status
export function useAuth() {
  return useQuery({
    queryKey: ['auth'],
    queryFn: async () => {
      const isValid = pb.authStore.isValid
      const userId = pb.authStore.record?.id
      
      if (!isValid || !userId) {
        return {
          isAuthenticated: false,
          isAdmin: false,
          userId: '',
        }
      }

      try {
        // Fetch the full user record to get the admin status
        const user = await pb.collection('users').getOne(userId, {
          requestKey: null,
        })
        
        return {
          isAuthenticated: true,
          isAdmin: user?.admin === true,
          userId: userId,
        }
      } catch (error) {
        console.error('Error fetching user:', error)
        return {
          isAuthenticated: isValid,
          isAdmin: false,
          userId: userId || '',
        }
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  })
}

