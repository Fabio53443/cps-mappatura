import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { createUser } from '$lib/server/auth';
import { count } from 'drizzle-orm';

// Check if setup is needed (no users exist)
export async function GET() {
	try {
		const [result] = await db.select({ count: count() }).from(user);
		const needsSetup = result.count === 0;
		return json({ needsSetup });
	} catch (error) {
		console.error('Error checking setup status:', error);
		return json({ error: 'Failed to check setup status' }, { status: 500 });
	}
}

// Create first admin user
export async function POST({ request }) {
	try {
		// First check if any users exist
		const [result] = await db.select({ count: count() }).from(user);
		if (result.count > 0) {
			return json({ error: 'Setup already completed. Users already exist.' }, { status: 403 });
		}

		const body = await request.json();
		const { username, password } = body || {};

		if (!username || !password) {
			return json({ error: 'Username and password are required' }, { status: 400 });
		}

		if (password.length < 8) {
			return json({ error: 'Password must be at least 8 characters' }, { status: 400 });
		}

		// Create the first user as admin
		const newUser = await createUser(username, password, 'admin');

		return json({
			success: true,
			user: { id: newUser.id, username: newUser.username, role: newUser.role }
		}, { status: 201 });
	} catch (error) {
		console.error('Error creating admin user:', error);
		if (error.message?.includes('already exists')) {
			return json({ error: error.message }, { status: 409 });
		}
		return json({ error: 'Failed to create admin user' }, { status: 500 });
	}
}
