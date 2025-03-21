import { pgTable, serial, text, integer, doublePrecision, timestamp, json, pgEnum } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
	id: serial('id').primaryKey(),
	age: integer('age')
});

export const municipioEnum = pgEnum('municipio_enum', [
	'I','II','III','IV','V','VI','VII','VIII','IX',
	'X','XI','XII','XIII','XIV','XV','XVI'
]);

export const location = pgTable('location', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description'),
	latitude: doublePrecision('latitude').notNull(),
	longitude: doublePrecision('longitude').notNull(),
	street: text('street'),
	municipio: municipioEnum('municipio'),
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
