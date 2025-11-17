import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pb, type User } from './src/lib/pb.js'

// Constants (matching src/constants.ts)
const BASE_URL = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons"

interface IconMetadata {
	base: string
	aliases: string[]
	categories: string[]
	update: {
		timestamp: string
		author: {
			id: number
			login?: string
			name?: string
		}
	}
}

interface MetadataFile {
	[key: string]: IconMetadata
}

const STATUSES = ['pending', 'approved', 'rejected', 'added_to_collection'] as const

async function getOrCreateUser(email: string, username: string, password: string = 'password123'): Promise<User> {
	try {
		// Try to authenticate first (if user exists, this will work)
		try {
			await pb.collection('users').authWithPassword(email, password, {
				requestKey: null
			})
			const user = pb.authStore.record as unknown	as User
			console.log(`✓ Authenticated existing user: ${email}`)
			return user
		} catch (authError) {
			// User doesn't exist or wrong password, try to create
			console.log(`  User ${email} not found, creating...`)
		}

		// Create new user if doesn't exist
		const user = await pb.collection('users').create<User>({
			email,
			username,
			password,
			passwordConfirm: password,
			emailVisibility: true
		}, {
			requestKey: null
		})
		
		console.log(`✓ Created new user: ${email}`)
		
		// Authenticate with the newly created user
		await pb.collection('users').authWithPassword(email, password, {
			requestKey: null
		})
		
		return user
	} catch (error: any) {
		console.error(`✗ Error with user ${email}:`, error?.message || error)
		throw error
	}
}

async function downloadImage(iconName: string, format: 'svg' | 'png' | 'webp'): Promise<File> {
	const url = `${BASE_URL}/${format}/${iconName}.${format}`
	console.log(`  Downloading: ${url}`)
	
	const response = await fetch(url)
	if (!response.ok) {
		throw new Error(`Failed to download ${url}: ${response.statusText}`)
	}
	
	// Get the blob from the response
	const blob = await response.blob()
	
	// Create a File instance from the blob (like in PocketBase docs)
	const file = new File([blob], `${iconName}.${format}`, {
		type: blob.type || `image/${format === 'svg' ? 'svg+xml' : format}`
	})
	
	return file
}

async function createFakeSubmission(
	iconName: string, 
	iconData: IconMetadata, 
	user: User,
	approvedById?: string
) {
	try {
		console.log(`\n📝 Creating submission for: ${iconName} (as ${user.email})`)
		
		// Authenticate as the user who will create the submission
		console.log(`  🔐 Authenticating as ${user.email}...`)
		await pb.collection('users').authWithPassword(user.email, 'password123', {
			requestKey: null
		})
		
		// Download the image based on the base format (returns File instance)
		const format = iconData.base as 'svg' | 'png' | 'webp'
		const file = await downloadImage(iconName, format)
		
		// Randomly select a status
		const status = STATUSES[Math.floor(Math.random() * STATUSES.length)]
		
		// Prepare submission data (like in PocketBase docs)
		const submissionData: Record<string, any> = {
			name: iconName,
			assets: [file], // files must be Blob or File instances
			created_by: user.id,
			status: status,
			extras: {
				aliases: iconData.aliases || [],
				categories: iconData.categories || [],
				base: iconData.base
			}
		}
		
		// Only add approved_by if status is approved or added_to_collection
		if ((status === 'approved' || status === 'added_to_collection') && approvedById) {
			submissionData.approved_by = approvedById
		}
		
		const submission = await pb.collection('submissions').create(submissionData, {
			requestKey: null // Disable auto-cancellation
		})
		
		console.log(`✓ Created submission: ${iconName} (${status})`)
		return submission
	} catch (error: any) {
		console.error(`✗ Failed to create submission for ${iconName}:`, error?.message || error)
		if (error?.response) {
			console.error('  Response:', JSON.stringify(error.response, null, 2))
		}
		if (error?.data) {
			console.error('  Data:', JSON.stringify(error.data, null, 2))
		}
		throw error
	}
}

async function main() {
	console.log('🚀 Starting fake submissions generator\n')
	
	// Read metadata.json
	const metadataPath = join(process.cwd(), '..', 'metadata.json')
	console.log(`📖 Reading metadata from: ${metadataPath}`)
	
	const metadataContent = await readFile(metadataPath, 'utf-8')
	const metadata: MetadataFile = JSON.parse(metadataContent)
	
	const iconNames = Object.keys(metadata)
	console.log(`✓ Found ${iconNames.length} icons in metadata\n`)
	
	// Create or get users sequentially to avoid conflicts
	console.log('👥 Setting up users...')
	const user1 = await getOrCreateUser('user1@example.com', 'user1')
	const user2 = await getOrCreateUser('user2@example.com', 'user2')
	const user3 = await getOrCreateUser('user3@example.com', 'user3')
	const adminUser = await getOrCreateUser('admin@example.com', 'admin')
	
	const users = [user1, user2, user3, adminUser]
	
	// Select random number of icons to create submissions for
	const numberOfSubmissions = parseInt(process.argv[2]) || 5
	console.log(`\n🎲 Creating ${numberOfSubmissions} random submissions...\n`)
	
	const selectedIndices = new Set<number>()
	while (selectedIndices.size < numberOfSubmissions) {
		selectedIndices.add(Math.floor(Math.random() * iconNames.length))
	}
	
	const submissions = []
	for (const index of selectedIndices) {
		const iconName = iconNames[index]
		const iconData = metadata[iconName]
		
		// Randomly select a user
		const randomUser = users[Math.floor(Math.random() * users.length)]
		
		try {
			const submission = await createFakeSubmission(
				iconName,
				iconData,
				randomUser, // Pass full user object
				adminUser.id
			)
			submissions.push(submission)
		} catch (error: any) {
			console.error(`✗ Skipping ${iconName} due to error:`, error?.message || error)
			if (error?.data) {
				console.error('  Error details:', JSON.stringify(error.data, null, 2))
			}
		}
	}
	
	console.log(`\n✨ Successfully created ${submissions.length} submissions!`)
	console.log('\n📊 Summary:')
	console.log(`  - Pending: ${submissions.filter(s => s.status === 'pending').length}`)
	console.log(`  - Approved: ${submissions.filter(s => s.status === 'approved').length}`)
	console.log(`  - Rejected: ${submissions.filter(s => s.status === 'rejected').length}`)
	console.log(`  - Added to Collection: ${submissions.filter(s => s.status === 'added_to_collection').length}`)
	
	// Clear auth store
	pb.authStore.clear()
}

main().catch((error) => {
	console.error('\n❌ Fatal error:', error)
	process.exit(1)
})

