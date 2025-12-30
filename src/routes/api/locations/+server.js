import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { location } from '$lib/server/db/schema';
import { requireRole } from '$lib/server/auth';

const ALLOWED_ROLES = ['admin', 'editor'];

function validateLocationPayload(body) {
	const required = ['name', 'latitude', 'longitude', 'street', 'municipio', 'tipo'];
	for (const field of required) {
		if (body[field] === undefined || body[field] === null || body[field] === '') {
			return `${field} is required`;
		}
	}

	if (Number.isNaN(Number(body.latitude)) || Number.isNaN(Number(body.longitude))) {
		return 'latitude and longitude must be numbers';
	}

	return null;
}

export async function GET() {
	try {
		const locations = await db.select().from(location);
		return json(locations);
	} catch (error) {
		console.error('Error fetching locations:', error);
		return json({ error: 'Failed to fetch locations' }, { status: 500 });
	}
}

export async function POST({ request }) {
	try {
		const user = await requireRole(request, ALLOWED_ROLES);
		if (user?.status && user.status >= 400) return user; // Early return if error response

		const body = await request.json();
		const validationError = validateLocationPayload(body);
		if (validationError) {
			return json({ error: validationError }, { status: 400 });
		}

		const [created] = await db
			.insert(location)
			.values({
				name: body.name,
				description: body.description ?? null,
				latitude: Number(body.latitude),
				longitude: Number(body.longitude),
				street: body.street,
				municipio: body.municipio,
				tipo: body.tipo,
				managedby: body.managedby ?? null,
				link: body.link ?? null
			})
			.returning();

		return json(created, { status: 201 });
	} catch (error) {
		console.error('Error creating location:', error);
		return json({ error: 'Failed to create location' }, { status: 500 });
	}
}
