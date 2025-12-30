import jwt from 'jsonwebtoken';
import { db } from './db';
import { user } from './db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { json } from '@sveltejs/kit';

// Should be in environment variables in production
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-for-development-only';
const JWT_EXPIRES_IN = '24h';

export async function verifyCredentials(username, password) {
  const users = await db.select().from(user).where(eq(user.username, username));
  
  if (users.length === 0) {
    return null;
  }
  
  const foundUser = users[0];
  const passwordMatch = await bcrypt.compare(password, foundUser.hashedPassword);
  
  if (!passwordMatch) {
    return null;
  }
  
  // Update last login timestamp
  await db.update(user)
    .set({ lastLogin: new Date() })
    .where(eq(user.id, foundUser.id));
  
  return {
    id: foundUser.id,
    username: foundUser.username,
    role: foundUser.role
  };
}

export function createToken(userData) {
  return jwt.sign(
    { userId: userData.id, username: userData.username, role: userData.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export async function validateUser(request) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.split(' ')[1];
  const decodedToken = verifyToken(token);
  
  if (!decodedToken) {
    return null;
  }
  
  // Verify user still exists in the database
  const users = await db.select().from(user).where(eq(user.id, decodedToken.userId));
  
  if (users.length === 0) {
    return null;
  }
  
  return {
    id: decodedToken.userId,
    username: decodedToken.username,
    role: decodedToken.role || users[0].role
  };
}

// Helper to create a new user (for initial setup or testing)
export async function createUser(username, password, role = 'viewer') {
  // Check if the user already exists
  const existingUsers = await db.select().from(user).where(eq(user.username, username));
  if (existingUsers.length > 0) {
    throw new Error('User with this username already exists');
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const result = await db.insert(user)
    .values({
      username,
      hashedPassword,
      role,
      createdAt: new Date()
    })
    .returning();
  
  return result[0];
}

// Middleware to check authentication
export async function requireAuth(request) {
  const userData = await validateUser(request);
  
  if (!userData) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  return userData;
}

// Require a specific role (or array of roles)
export async function requireRole(request, roles) {
  const userData = await validateUser(request);
  if (!userData) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(userData.role)) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }
  return userData;
}
