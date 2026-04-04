CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'seller', 'customer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC(12, 2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  total NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO users (name, email, role)
VALUES ('TechNexus Demo Admin', 'admin@technexus.demo', 'admin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO products (seller_id, name, description, price, stock)
SELECT
  users.id,
  seeded.name,
  seeded.description,
  seeded.price,
  seeded.stock
FROM users
CROSS JOIN (
  VALUES
    ('RTX Creator Laptop', 'High-performance creator laptop for demos and visual review.', 1899.00, 4),
    ('Mechanical Keyboard', 'Hot-swappable keyboard with tactile switches.', 119.00, 12),
    ('4K Productivity Monitor', '27-inch monitor aimed at marketplace office setups.', 349.00, 7)
) AS seeded(name, description, price, stock)
WHERE users.email = 'admin@technexus.demo'
ON CONFLICT DO NOTHING;

INSERT INTO orders (user_id, total, status)
SELECT id, 2367.00, 'paid'
FROM users
WHERE email = 'admin@technexus.demo'
  AND NOT EXISTS (
    SELECT 1
    FROM orders
    WHERE status = 'paid'
  );
