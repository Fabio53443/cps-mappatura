import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { location, image } from '$lib/server/db/schema';

// Sample data for development
const sampleLocations = [
	{
		name: 'Colosseum',
		description: 'An ancient amphitheater in the center of Rome, Italy.',
		latitude: 41.8902,
		longitude: 12.4922
	},
	{
		name: 'Eiffel Tower',
		description: 'A wrought-iron lattice tower on the Champ de Mars in Paris, France.',
		latitude: 48.8584,
		longitude: 2.2945
	},
	{
		name: 'Sagrada Familia',
		description: 'A large unfinished Roman Catholic minor basilica in Barcelona, Spain.',
		latitude: 41.4036,
		longitude: 2.1744
	}
];

const sampleImages = [
	{
		locationIndex: 0,
		url: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5',
		caption: 'The Colosseum at sunset'
	},
	{
		locationIndex: 0,
		url: 'https://images.unsplash.com/photo-1604580864964-0462f5d5b1a8',
		caption: 'Inside the Colosseum'
	},
	{
		locationIndex: 1,
		url: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f',
		caption: 'Eiffel Tower at night'
	},
	{
		locationIndex: 1,
		url: 'https://images.unsplash.com/photo-1543349689-9a4d426bee8e',
		caption: 'View from Eiffel Tower'
	},
	{
		locationIndex: 2,
		url: 'https://images.unsplash.com/photo-1583779457094-ab6f9164a1b8',
		caption: 'Sagrada Familia exterior'
	}
];

export async function GET() {
	try {
		// Clear existing data
		await db.delete(image);
		await db.delete(location);
		
		// Insert locations
		const locationResults = [];
		for (const loc of sampleLocations) {
			const result = await db.insert(location).values(loc).returning();
			locationResults.push(result[0]);
		}
		
		// Insert images
		for (const img of sampleImages) {
			await db.insert(image).values({
				locationId: locationResults[img.locationIndex].id,
				url: img.url,
				caption: img.caption
			});
		}
		
		return json({ success: true, message: 'Database seeded successfully' });
	} catch (error) {
		console.error('Error seeding database:', error);
		return json({ error: 'Failed to seed database' }, { status: 500 });
	}
}
