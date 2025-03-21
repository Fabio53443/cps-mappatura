import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { image } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

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
