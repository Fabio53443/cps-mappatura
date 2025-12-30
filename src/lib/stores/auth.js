import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'auth_token';
const USER_KEY = 'auth_user';

function createAuthStore() {
	// Initialize from localStorage if available
	let initialToken = null;
	let initialUser = null;
	
	if (browser) {
		initialToken = localStorage.getItem(STORAGE_KEY);
		const storedUser = localStorage.getItem(USER_KEY);
		if (storedUser) {
			try {
				initialUser = JSON.parse(storedUser);
			} catch {
				initialUser = null;
			}
		}
	}

	const token = writable(initialToken);
	const user = writable(initialUser);

	// Persist to localStorage on change
	if (browser) {
		token.subscribe((value) => {
			if (value) {
				localStorage.setItem(STORAGE_KEY, value);
			} else {
				localStorage.removeItem(STORAGE_KEY);
			}
		});
		user.subscribe((value) => {
			if (value) {
				localStorage.setItem(USER_KEY, JSON.stringify(value));
			} else {
				localStorage.removeItem(USER_KEY);
			}
		});
	}

	async function login(username, password) {
		const res = await fetch('/api/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username, password })
		});
		const data = await res.json();
		if (!res.ok) {
			throw new Error(data.error || 'Login failed');
		}
		token.set(data.token);
		user.set(data.user);
		return data.user;
	}

	function logout() {
		token.set(null);
		user.set(null);
	}

	function getAuthHeaders() {
		let t;
		token.subscribe((v) => (t = v))();
		return t ? { Authorization: `Bearer ${t}` } : {};
	}

	const isAuthenticated = derived(token, ($token) => !!$token);
	const role = derived(user, ($user) => $user?.role || null);
	const canEdit = derived(role, ($role) => $role === 'admin' || $role === 'editor');
	const isAdmin = derived(role, ($role) => $role === 'admin');

	return {
		token,
		user,
		isAuthenticated,
		role,
		canEdit,
		isAdmin,
		login,
		logout,
		getAuthHeaders
	};
}

export const auth = createAuthStore();
