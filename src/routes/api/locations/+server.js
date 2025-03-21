import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { location } from '$lib/server/db/schema';

export async function GET() {
	try {
		const locations = await db.select().from(location);
		return json(locations);
	} catch (error) {
		console.error('Error fetching locations:', error);
		return json({ error: 'Failed to fetch locations' }, { status: 500 });
	}
}
