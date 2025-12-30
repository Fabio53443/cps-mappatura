import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { image, location } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { verifyToken } from '$lib/server/auth';
import { uploadImage, deleteImage } from '$lib/server/storage';

export async function GET({ params }) {
	try {
		const locationId = parseInt(params.id);
		
		if (isNaN(locationId)) {
			return json({ error: 'Invalid location ID' }, { status: 400 });
		}
		
		const images = await db.select().from(image).where(eq(image.locationId, locationId));
		return json(images);
	} catch (error) {
		console.error('Error fetching images:', error);
		return json({ error: 'Failed to fetch images' }, { status: 500 });
	}
}

export async function POST({ params, request }) {
	try {
		// Verify authentication
		const authHeader = request.headers.get('Authorization');
		const token = authHeader?.replace('Bearer ', '');
		
		if (!token) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
		
		const user = verifyToken(token);
		if (!user || (user.role !== 'admin' && user.role !== 'editor')) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}
		
		const locationId = parseInt(params.id);
		if (isNaN(locationId)) {
			return json({ error: 'Invalid location ID' }, { status: 400 });
		}
		
		// Verify location exists
		const [loc] = await db.select().from(location).where(eq(location.id, locationId));
		if (!loc) {
			return json({ error: 'Location not found' }, { status: 404 });
		}
		
		// Parse the multipart form data
		const formData = await request.formData();
		const file = formData.get('file');
		const caption = formData.get('caption') || null;
		
		if (!file || !(file instanceof File)) {
			return json({ error: 'No file provided' }, { status: 400 });
		}
		
		// Validate file type
		const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
		if (!allowedTypes.includes(file.type)) {
			return json({ error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP' }, { status: 400 });
		}
		
		// Max file size: 10MB
		const maxSize = 10 * 1024 * 1024;
		if (file.size > maxSize) {
			return json({ error: 'File too large. Maximum size: 10MB' }, { status: 400 });
		}
		
		// Upload to MinIO
		const buffer = Buffer.from(await file.arrayBuffer());
		const { key, url } = await uploadImage(locationId.toString(), file.name, buffer, file.type);
		
		// Save to database
		const [newImage] = await db.insert(image).values({
			locationId,
			key,
			url,
			filename: file.name,
			contentType: file.type,
			size: file.size,
			caption
		}).returning();
		
		return json(newImage, { status: 201 });
	} catch (error) {
		console.error('Error uploading image:', error);
		return json({ error: 'Failed to upload image' }, { status: 500 });
	}
}

export async function DELETE({ params, request, url }) {
	try {
		// Verify authentication
		const authHeader = request.headers.get('Authorization');
		const token = authHeader?.replace('Bearer ', '');
		
		if (!token) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
		
		const user = verifyToken(token);
		if (!user || (user.role !== 'admin' && user.role !== 'editor')) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}
		
		const locationId = parseInt(params.id);
		const imageId = parseInt(url.searchParams.get('imageId'));
		
		if (isNaN(locationId) || isNaN(imageId)) {
			return json({ error: 'Invalid ID' }, { status: 400 });
		}
		
		// Get the image to delete
		const [img] = await db.select().from(image)
			.where(eq(image.id, imageId));
		
		if (!img || img.locationId !== locationId) {
			return json({ error: 'Image not found' }, { status: 404 });
		}
		
		// Delete from MinIO
		await deleteImage(img.key);
		
		// Delete from database
		await db.delete(image).where(eq(image.id, imageId));
		
		return json({ success: true });
	} catch (error) {
		console.error('Error deleting image:', error);
		return json({ error: 'Failed to delete image' }, { status: 500 });
	}
}
