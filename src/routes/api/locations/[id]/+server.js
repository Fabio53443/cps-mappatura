import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { location } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { requireRole } from '$lib/server/auth';

const ALLOWED_ROLES = ['admin', 'editor'];
const DELETE_ROLES = ['admin'];

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

export async function PUT({ request, params }) {
	try {
		const user = await requireRole(request, ALLOWED_ROLES);
		if (user?.status && user.status >= 400) return user;

		const body = await request.json();
		const validationError = validateLocationPayload(body);
		if (validationError) {
			return json({ error: validationError }, { status: 400 });
		}

		const locationId = Number(params.id);
		if (Number.isNaN(locationId)) {
			return json({ error: 'Invalid location id' }, { status: 400 });
		}

		const [updated] = await db
			.update(location)
			.set({
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
			.where(eq(location.id, locationId))
			.returning();

		if (!updated) {
			return json({ error: 'Location not found' }, { status: 404 });
		}

		return json(updated, { status: 200 });
	} catch (error) {
		console.error('Error updating location:', error);
		return json({ error: 'Failed to update location' }, { status: 500 });
	}
}

export async function DELETE({ request, params }) {
	try {
		const user = await requireRole(request, DELETE_ROLES);
		if (user?.status && user.status >= 400) return user;

		const locationId = Number(params.id);
		if (Number.isNaN(locationId)) {
			return json({ error: 'Invalid location id' }, { status: 400 });
		}

		const [deleted] = await db
			.delete(location)
			.where(eq(location.id, locationId))
			.returning();

		if (!deleted) {
			return json({ error: 'Location not found' }, { status: 404 });
		}

		return json({ success: true, deletedId: locationId }, { status: 200 });
	} catch (error) {
		console.error('Error deleting location:', error);
		return json({ error: 'Failed to delete location' }, { status: 500 });
	}
}
