import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const passwordVault = sqliteTable('password_vault', {
  id: text('id').primaryKey(),
  version: integer('version').notNull().default(1),
  kdfSalt: text('kdf_salt').notNull(),
  kdfN: integer('kdf_n').notNull(),
  kdfR: integer('kdf_r').notNull(),
  kdfP: integer('kdf_p').notNull(),
  wrappedKeyNonce: text('wrapped_key_nonce').notNull(),
  wrappedKeyCiphertext: text('wrapped_key_ciphertext').notNull(),
  wrappedKeyTag: text('wrapped_key_tag').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
})

export const passwordGroups = sqliteTable(
  'password_groups',
  {
    id: text('id').primaryKey(),
    encryptedPayload: text('encrypted_payload').notNull(),
    position: integer('position').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [index('password_groups_position_idx').on(table.position, table.createdAt)]
)

export const passwordItems = sqliteTable(
  'password_items',
  {
    id: text('id').primaryKey(),
    groupId: text('group_id').references(() => passwordGroups.id, { onDelete: 'set null' }),
    encryptedPayload: text('encrypted_payload').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [
    index('password_items_group_idx').on(table.groupId),
    index('password_items_updated_idx').on(table.updatedAt)
  ]
)
