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
  status: 'approved' | 'rejected' | 'pending'
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

interface TypedPocketBase extends PocketBase {
  collection(idOrName: string): RecordService // default fallback for any other collection
  collection(idOrName: 'users'): RecordService<User>
  collection(idOrName: 'submissions'): RecordService<Submission>
}

export const pb = new PocketBase('http://127.0.0.1:8090') as TypedPocketBase;

