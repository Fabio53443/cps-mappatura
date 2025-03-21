import { pgTable, serial, text, integer, doublePrecision, timestamp, json, pgEnum } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
	id: serial('id').primaryKey(),
	email: text('email').notNull(),
	hashedPassword: text('hashed_password').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	lastLogin: timestamp('last_login')
});

export const municipioEnum = pgEnum('municipio_enum', [
	'I','II','III','IV','V','VI','VII','VIII','IX',
	'X','XI','XII','XIII','XIV','XV','XVI'
]);
export const tipo = pgEnum('tipo_enum', [
	'Biblioteca/Aula Studio', 'Centro di Aggregazione Giovanile', 'Centro Famiglia', 'Altro'
]);

export const location = pgTable('location', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description'),
	latitude: doublePrecision('latitude').notNull(),
	longitude: doublePrecision('longitude').notNull(),
	street: text('street').notNull(),
	municipio: municipioEnum('municipio').notNull(),
	tipo: tipo('tipo').notNull(),
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
