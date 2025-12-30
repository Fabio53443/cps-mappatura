import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const BUCKET_NAME = 'location-images';

// MinIO client configuration
const s3Client = new S3Client({
	endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
	region: 'us-east-1', // MinIO doesn't care about region but SDK requires it
	credentials: {
		accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
		secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
	},
	forcePathStyle: true // Required for MinIO
});

/**
 * Ensure the bucket exists, create if not
 */
async function ensureBucket() {
	const { CreateBucketCommand, HeadBucketCommand, PutBucketPolicyCommand } = await import('@aws-sdk/client-s3');
	
	try {
		await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
	} catch (error) {
		if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
			// Create the bucket
			await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
			
			// Set bucket policy for public read access to images
			const policy = {
				Version: '2012-10-17',
				Statement: [
					{
						Effect: 'Allow',
						Principal: '*',
						Action: ['s3:GetObject'],
						Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`]
					}
				]
			};
			
			await s3Client.send(new PutBucketPolicyCommand({
				Bucket: BUCKET_NAME,
				Policy: JSON.stringify(policy)
			}));
			
			console.log(`Bucket "${BUCKET_NAME}" created with public read policy`);
		} else {
			throw error;
		}
	}
}

/**
 * Upload an image to MinIO
 * @param {string} locationId - The location ID
 * @param {string} filename - Original filename
 * @param {Buffer|Uint8Array} data - File data
 * @param {string} contentType - MIME type
 * @returns {Promise<{key: string, url: string}>}
 */
export async function uploadImage(locationId, filename, data, contentType) {
	await ensureBucket();
	
	// Generate unique key: locations/{locationId}/{timestamp}-{filename}
	const timestamp = Date.now();
	const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
	const key = `locations/${locationId}/${timestamp}-${sanitizedFilename}`;
	
	await s3Client.send(new PutObjectCommand({
		Bucket: BUCKET_NAME,
		Key: key,
		Body: data,
		ContentType: contentType
	}));
	
	// Return the public URL
	const endpoint = process.env.MINIO_ENDPOINT || 'http://localhost:9000';
	const url = `${endpoint}/${BUCKET_NAME}/${key}`;
	
	return { key, url };
}

/**
 * Delete an image from MinIO
 * @param {string} key - The object key
 */
export async function deleteImage(key) {
	await s3Client.send(new DeleteObjectCommand({
		Bucket: BUCKET_NAME,
		Key: key
	}));
}

/**
 * List all images for a location
 * @param {string} locationId - The location ID
 * @returns {Promise<Array<{key: string, url: string, lastModified: Date}>>}
 */
export async function listLocationImages(locationId) {
	await ensureBucket();
	
	const prefix = `locations/${locationId}/`;
	const response = await s3Client.send(new ListObjectsV2Command({
		Bucket: BUCKET_NAME,
		Prefix: prefix
	}));
	
	const endpoint = process.env.MINIO_ENDPOINT || 'http://localhost:9000';
	
	return (response.Contents || []).map(obj => ({
		key: obj.Key,
		url: `${endpoint}/${BUCKET_NAME}/${obj.Key}`,
		lastModified: obj.LastModified,
		size: obj.Size
	}));
}

/**
 * Get a presigned URL for uploading directly from the browser
 * @param {string} locationId - The location ID
 * @param {string} filename - Original filename
 * @param {string} contentType - MIME type
 * @returns {Promise<{uploadUrl: string, key: string, publicUrl: string}>}
 */
export async function getPresignedUploadUrl(locationId, filename, contentType) {
	await ensureBucket();
	
	const timestamp = Date.now();
	const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
	const key = `locations/${locationId}/${timestamp}-${sanitizedFilename}`;
	
	const command = new PutObjectCommand({
		Bucket: BUCKET_NAME,
		Key: key,
		ContentType: contentType
	});
	
	const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
	const endpoint = process.env.MINIO_ENDPOINT || 'http://localhost:9000';
	const publicUrl = `${endpoint}/${BUCKET_NAME}/${key}`;
	
	return { uploadUrl, key, publicUrl };
}

export { s3Client, BUCKET_NAME };
