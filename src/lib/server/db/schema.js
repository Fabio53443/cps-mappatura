import { pgTable, serial, text, integer, doublePrecision, timestamp, json } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
	id: serial('id').primaryKey(),
	age: integer('age')
});

export const location = pgTable('location', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description'),
	latitude: doublePrecision('latitude').notNull(),
	longitude: doublePrecision('longitude').notNull(),
	street: text('street'),
	municipio: text('municipio'),
	managedby: text('managedby'),
	link: text('link'),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const image = pgTable('image', {
	id: serial('id').primaryKey(),
	locationId: integer('location_id').references(() => location.id).notNull(),
	url: text('url').notNull(),
	caption: text('caption'),
	createdAt: timestamp('created_at').defaultNow().notNull()
});
