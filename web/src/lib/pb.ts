import PocketBase, { RecordService } from 'pocketbase';

export interface User {
  id: string
  username: string
  email: string
  admin?: boolean
  avatar?: string
  created: string
  updated: string
}

export interface Submission {
  id: string
  name: string
  assets: string[]
  created_by: string
  status: 'approved' | 'rejected' | 'pending' | 'added_to_collection'
  approved_by: string
	expand: {
		created_by: User
		approved_by: User
	}
  extras: { 
    aliases: string[]
    categories: string[]
    base?: string
    colors?: {
      dark?: string
      light?: string
    }
    wordmark?: {
      dark?: string
      light?: string
    }
  }
  created: string
  updated: string
}

export interface CommunityGallery {
  id: string
  name: string
  created_by: string
  status: 'approved' | 'rejected' | 'pending' | 'added_to_collection'
  assets: string[]
	created: string
	updated: string
  extras: { 
    aliases: string[]
    categories: string[]
    base?: string
    colors?: {
      dark?: string
      light?: string
    }
    wordmark?: {
      dark?: string
      light?: string
    }
  }
}

interface TypedPocketBase extends PocketBase {
  collection(idOrName: string): RecordService // default fallback for any other collection
  collection(idOrName: 'users'): RecordService<User>
  collection(idOrName: 'submissions'): RecordService<Submission>
	collection(idOrName: 'community_gallery'): RecordService<CommunityGallery>
}

export const pb = new PocketBase('http://127.0.0.1:8090') as TypedPocketBase;

