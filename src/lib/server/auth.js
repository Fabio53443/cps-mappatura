import jwt from 'jsonwebtoken';
import { db } from './db';
import { user } from './db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { json } from '@sveltejs/kit';

// Should be in environment variables in production
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-for-development-only';
const JWT_EXPIRES_IN = '24h';

export async function verifyCredentials(email, password) {
  const users = await db.select().from(user).where(eq(user.email, email));
  
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
    email: foundUser.email
  };
}

export function createToken(userData) {
  return jwt.sign(
    { userId: userData.id, email: userData.email },
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
    email: decodedToken.email
  };
}

// Helper to create a new user (for initial setup or testing)
export async function createUser(email, password) {
  // Check if the user already exists
  const existingUsers = await db.select().from(user).where(eq(user.email, email));
  if (existingUsers.length > 0) {
    throw new Error('User with this email already exists');
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const result = await db.insert(user)
    .values({
      email,
      hashedPassword,
      createdAt: new Date()
    })
    .returning();
  
  return result[0];
}

// Middleware to check authentication
export async function requireAuth(request) {
  const user = await validateUser(request);
  
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  return user;
}
