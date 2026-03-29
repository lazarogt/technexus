import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST ?? "postgres",
  port: Number(process.env.DB_PORT ?? 5432),
  user: process.env.DB_USER ?? "technexus",
  password: process.env.DB_PASSWORD ?? "technexus",
  database: process.env.DB_NAME ?? "technexus"
});

const ensureDatabaseSchema = async (): Promise<void> => {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
    CREATE SCHEMA IF NOT EXISTS technexus;

    CREATE TABLE IF NOT EXISTS technexus.users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('customer', 'seller', 'admin')),
      is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE technexus.users
    ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE;

    CREATE TABLE IF NOT EXISTS technexus.categories (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS categories_name_lower_idx
    ON technexus.categories (LOWER(name));

    CREATE TABLE IF NOT EXISTS technexus.products (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
      stock INTEGER NOT NULL CHECK (stock >= 0),
      category_id UUID NOT NULL REFERENCES technexus.categories(id) ON DELETE RESTRICT,
      seller_id UUID NOT NULL REFERENCES technexus.users(id) ON DELETE CASCADE,
      images TEXT[] NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS products_category_id_idx
    ON technexus.products (category_id);

    CREATE INDEX IF NOT EXISTS products_seller_id_idx
    ON technexus.products (seller_id);

    CREATE INDEX IF NOT EXISTS products_created_at_idx
    ON technexus.products (created_at DESC);

    CREATE INDEX IF NOT EXISTS products_name_trgm_idx
    ON technexus.products USING GIN (name gin_trgm_ops);

    CREATE INDEX IF NOT EXISTS products_description_trgm_idx
    ON technexus.products USING GIN (description gin_trgm_ops);

    CREATE TABLE IF NOT EXISTS technexus.cart_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES technexus.users(id) ON DELETE CASCADE,
      product_id UUID NOT NULL REFERENCES technexus.products(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, product_id)
    );

    CREATE INDEX IF NOT EXISTS cart_items_user_id_idx
    ON technexus.cart_items (user_id);

    CREATE TABLE IF NOT EXISTS technexus.orders (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES technexus.users(id) ON DELETE CASCADE,
      total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
      buyer_name TEXT NOT NULL DEFAULT '',
      buyer_email TEXT NOT NULL DEFAULT '',
      buyer_phone TEXT,
      shipping_address JSONB,
      shipping_cost NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
      payment_method TEXT NOT NULL DEFAULT 'cash_on_delivery'
        CHECK (payment_method IN ('cash_on_delivery')),
      order_total NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (order_total >= 0),
      status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'shipped', 'delivered')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE technexus.orders
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

    ALTER TABLE technexus.orders
    ADD COLUMN IF NOT EXISTS buyer_name TEXT NOT NULL DEFAULT '';

    ALTER TABLE technexus.orders
    ADD COLUMN IF NOT EXISTS buyer_email TEXT NOT NULL DEFAULT '';

    ALTER TABLE technexus.orders
    ADD COLUMN IF NOT EXISTS buyer_phone TEXT;

    ALTER TABLE technexus.orders
    ADD COLUMN IF NOT EXISTS shipping_address JSONB;

    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'technexus'
          AND table_name = 'orders'
          AND column_name = 'shipping_address'
          AND data_type <> 'jsonb'
      ) THEN
        ALTER TABLE technexus.orders
        ALTER COLUMN shipping_address TYPE JSONB
        USING CASE
          WHEN shipping_address IS NULL THEN NULL
          ELSE jsonb_build_object('formatted', shipping_address)
        END;
      END IF;
    END
    $$;

    ALTER TABLE technexus.orders
    ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(12, 2) NOT NULL DEFAULT 0;

    ALTER TABLE technexus.orders
    ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cash_on_delivery';

    ALTER TABLE technexus.orders
    ADD COLUMN IF NOT EXISTS order_total NUMERIC(12, 2) NOT NULL DEFAULT 0;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'orders_payment_method_check'
      ) THEN
        ALTER TABLE technexus.orders
        ADD CONSTRAINT orders_payment_method_check
        CHECK (payment_method IN ('cash_on_delivery'));
      END IF;
    END
    $$;

    CREATE INDEX IF NOT EXISTS orders_user_id_idx
    ON technexus.orders (user_id);

    CREATE INDEX IF NOT EXISTS orders_status_created_at_idx
    ON technexus.orders (status, created_at DESC);

    CREATE INDEX IF NOT EXISTS orders_created_at_idx
    ON technexus.orders (created_at DESC);

    CREATE INDEX IF NOT EXISTS orders_payment_method_idx
    ON technexus.orders (payment_method);

    UPDATE technexus.orders o
    SET buyer_name = u.name
    FROM technexus.users u
    WHERE u.id = o.user_id
      AND o.buyer_name = '';

    UPDATE technexus.orders o
    SET buyer_email = u.email
    FROM technexus.users u
    WHERE u.id = o.user_id
      AND o.buyer_email = '';

    UPDATE technexus.orders
    SET order_total = total
    WHERE order_total = 0
      AND total <> 0;

    CREATE TABLE IF NOT EXISTS technexus.order_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      order_id UUID NOT NULL REFERENCES technexus.orders(id) ON DELETE CASCADE,
      product_id UUID NOT NULL REFERENCES technexus.products(id) ON DELETE RESTRICT,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      price NUMERIC(12, 2) NOT NULL CHECK (price >= 0)
    );

    CREATE INDEX IF NOT EXISTS order_items_order_id_idx
    ON technexus.order_items (order_id);

    CREATE INDEX IF NOT EXISTS order_items_product_id_idx
    ON technexus.order_items (product_id);

    CREATE TABLE IF NOT EXISTS technexus.email_outbox (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      order_id UUID NOT NULL REFERENCES technexus.orders(id) ON DELETE CASCADE,
      recipient_type TEXT NOT NULL CHECK (recipient_type IN ('buyer', 'seller')),
      recipient_email TEXT NOT NULL,
      seller_id UUID REFERENCES technexus.users(id) ON DELETE SET NULL,
      subject TEXT NOT NULL,
      html TEXT NOT NULL,
      text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
      attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
      last_error TEXT,
      next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS email_outbox_status_next_attempt_idx
    ON technexus.email_outbox (status, next_attempt_at);

    CREATE INDEX IF NOT EXISTS email_outbox_status_created_at_idx
    ON technexus.email_outbox (status, created_at DESC);

    CREATE INDEX IF NOT EXISTS email_outbox_status_updated_at_idx
    ON technexus.email_outbox (status, updated_at DESC);

    CREATE INDEX IF NOT EXISTS email_outbox_attempts_created_at_idx
    ON technexus.email_outbox (attempts, created_at DESC);

    CREATE INDEX IF NOT EXISTS email_outbox_order_id_idx
    ON technexus.email_outbox (order_id);

    CREATE UNIQUE INDEX IF NOT EXISTS email_outbox_buyer_unique_idx
    ON technexus.email_outbox (order_id, recipient_type, recipient_email)
    WHERE seller_id IS NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS email_outbox_seller_unique_idx
    ON technexus.email_outbox (order_id, recipient_type, recipient_email, seller_id)
    WHERE seller_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS technexus.messages (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      sender_id UUID NOT NULL REFERENCES technexus.users(id) ON DELETE CASCADE,
      recipient_id UUID NOT NULL REFERENCES technexus.users(id) ON DELETE CASCADE,
      order_id UUID REFERENCES technexus.orders(id) ON DELETE SET NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS messages_sender_id_idx
    ON technexus.messages (sender_id);

    CREATE INDEX IF NOT EXISTS messages_recipient_id_idx
    ON technexus.messages (recipient_id);

    CREATE INDEX IF NOT EXISTS messages_order_id_idx
    ON technexus.messages (order_id);

    CREATE INDEX IF NOT EXISTS messages_created_at_idx
    ON technexus.messages (created_at DESC);

    CREATE TABLE IF NOT EXISTS technexus.admin_activity_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      admin_id UUID NOT NULL REFERENCES technexus.users(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id UUID,
      details JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS admin_activity_logs_admin_id_idx
    ON technexus.admin_activity_logs (admin_id);
  `);
};

export const connectToDatabase = async (): Promise<void> => {
  const client = await pool.connect();

  try {
    await client.query("SELECT 1");
    await ensureDatabaseSchema();
    console.log("Connected to PostgreSQL successfully.");
  } finally {
    client.release();
  }
};

export default pool;
