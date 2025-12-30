import { json } from '@sveltejs/kit';
import { verifyCredentials, createToken } from '$lib/server/auth';

export async function POST({ request }) {
	try {
		const body = await request.json();
		const { username, password } = body || {};

		if (!username || !password) {
			return json({ error: 'Username and password are required' }, { status: 400 });
		}

		const user = await verifyCredentials(username, password);
		if (!user) {
			return json({ error: 'Invalid credentials' }, { status: 401 });
		}

		const token = createToken(user);
		return json({ token, user: { id: user.id, username: user.username, role: user.role } });
	} catch (error) {
		console.error('Login error:', error);
		return json({ error: 'Login failed' }, { status: 500 });
	}
}
