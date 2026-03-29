INSERT INTO technexus.users (id, name, email, password, role, is_blocked, created_at)
VALUES
  (
    '00000000-0000-4000-8000-000000000001',
    'TechNexus Admin',
    'admin@example.com',
    '$2a$12$1KRkoaPHr6xOpmOXQE4y/eIoYtpLjG3eY5n9x21K5Iru6VY.c./xe',
    'admin',
    FALSE,
    NOW() - INTERVAL '30 days'
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    'Luna Seller',
    'seller@example.com',
    '$2a$12$5Ui2FrC2RqEoHVQkFDRIuuaoWeCMrqEi4BOmeqqeHZAEJVgDv.9i6',
    'seller',
    FALSE,
    NOW() - INTERVAL '21 days'
  ),
  (
    '00000000-0000-4000-8000-000000000003',
    'Mateo Customer',
    'customer@example.com',
    '$2a$12$kbaddnl75Gn/BQsX7HYbAuD6Ijrli7YBPF6ogtZ0ZJ4Y6DWLphKr6',
    'customer',
    FALSE,
    NOW() - INTERVAL '14 days'
  )
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  is_blocked = EXCLUDED.is_blocked;

INSERT INTO technexus.categories (id, name, created_at)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'Laptops', NOW() - INTERVAL '30 days'),
  ('10000000-0000-4000-8000-000000000002', 'Audio', NOW() - INTERVAL '30 days'),
  ('10000000-0000-4000-8000-000000000003', 'Accessories', NOW() - INTERVAL '30 days')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name;

INSERT INTO technexus.products (
  id,
  name,
  description,
  price,
  stock,
  category_id,
  seller_id,
  images,
  created_at,
  updated_at
)
VALUES
  (
    '20000000-0000-4000-8000-000000000001',
    'NovaBook Pro 14',
    'Portable creator laptop with bright display, quiet thermals and all-day battery for marketplace demos.',
    1499.00,
    12,
    '10000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000002',
    ARRAY[
      '/uploads/seed-marketplace-laptop.svg',
      '/uploads/seed-marketplace-keyboard.svg'
    ],
    NOW() - INTERVAL '12 days',
    NOW() - INTERVAL '2 hours'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'Orbit ANC Headphones',
    'Wireless over-ear headphones with deep isolation, warm tuning and fast pairing for everyday work.',
    289.00,
    27,
    '10000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000002',
    ARRAY['/uploads/seed-marketplace-headphones.svg'],
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '5 hours'
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    'Forge Mechanical Keyboard',
    'Compact mechanical keyboard with tactile switches, aluminum deck and soft amber backlight.',
    179.00,
    40,
    '10000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000002',
    ARRAY['/uploads/seed-marketplace-keyboard.svg'],
    NOW() - INTERVAL '8 days',
    NOW() - INTERVAL '90 minutes'
  )
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  stock = EXCLUDED.stock,
  category_id = EXCLUDED.category_id,
  seller_id = EXCLUDED.seller_id,
  images = EXCLUDED.images,
  updated_at = EXCLUDED.updated_at;

INSERT INTO technexus.cart_items (id, user_id, product_id, quantity, created_at, updated_at)
VALUES
  (
    '50000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000003',
    1,
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '15 minutes'
  )
ON CONFLICT (id) DO UPDATE
SET
  quantity = EXCLUDED.quantity,
  updated_at = EXCLUDED.updated_at;

INSERT INTO technexus.orders (
  id,
  user_id,
  total,
  buyer_name,
  buyer_email,
  buyer_phone,
  shipping_address,
  shipping_cost,
  payment_method,
  order_total,
  status,
  created_at,
  updated_at
)
VALUES
  (
    '30000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000003',
    1499.00,
    'Mateo Customer',
    'customer@example.com',
    '+1 202 555 0181',
    '{"line1":"12 Market Street","city":"Austin","state":"TX","zip":"78701","country":"US"}'::jsonb,
    25.00,
    'cash_on_delivery',
    1524.00,
    'pending',
    NOW() - INTERVAL '3 hours',
    NOW() - INTERVAL '45 minutes'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000003',
    468.00,
    'Mateo Customer',
    'customer@example.com',
    '+1 202 555 0181',
    '{"line1":"12 Market Street","city":"Austin","state":"TX","zip":"78701","country":"US"}'::jsonb,
    18.00,
    'cash_on_delivery',
    486.00,
    'delivered',
    NOW() - INTERVAL '6 days',
    NOW() - INTERVAL '4 days'
  )
ON CONFLICT (id) DO UPDATE
SET
  total = EXCLUDED.total,
  buyer_name = EXCLUDED.buyer_name,
  buyer_email = EXCLUDED.buyer_email,
  buyer_phone = EXCLUDED.buyer_phone,
  shipping_address = EXCLUDED.shipping_address,
  shipping_cost = EXCLUDED.shipping_cost,
  payment_method = EXCLUDED.payment_method,
  order_total = EXCLUDED.order_total,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;

INSERT INTO technexus.order_items (id, order_id, product_id, quantity, price)
VALUES
  (
    '31000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    1,
    1499.00
  ),
  (
    '31000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    1,
    289.00
  ),
  (
    '31000000-0000-4000-8000-000000000003',
    '30000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000003',
    1,
    179.00
  )
ON CONFLICT (id) DO UPDATE
SET
  order_id = EXCLUDED.order_id,
  product_id = EXCLUDED.product_id,
  quantity = EXCLUDED.quantity,
  price = EXCLUDED.price;

INSERT INTO technexus.email_outbox (
  id,
  order_id,
  recipient_type,
  recipient_email,
  seller_id,
  subject,
  html,
  text,
  status,
  attempts,
  last_error,
  next_attempt_at,
  created_at,
  updated_at
)
VALUES
  (
    '40000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'buyer',
    'customer@example.com',
    NULL,
    'TechNexus order confirmation',
    '<p>Your order is confirmed and queued for seller fulfillment.</p>',
    'Your order is confirmed and queued for seller fulfillment.',
    'sent',
    1,
    NULL,
    NOW() - INTERVAL '3 hours',
    NOW() - INTERVAL '3 hours',
    NOW() - INTERVAL '3 hours'
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000001',
    'seller',
    'seller@example.com',
    '00000000-0000-4000-8000-000000000002',
    'New order pending fulfillment',
    '<p>A new TechNexus order is waiting in the seller dashboard.</p>',
    'A new TechNexus order is waiting in the seller dashboard.',
    'pending',
    0,
    NULL,
    NOW() - INTERVAL '5 minutes',
    NOW() - INTERVAL '3 hours',
    NOW() - INTERVAL '5 minutes'
  ),
  (
    '40000000-0000-4000-8000-000000000003',
    '30000000-0000-4000-8000-000000000002',
    'buyer',
    'customer@technexus.local',
    NULL,
    'Delivery follow-up',
    '<p>Your recent order has been delivered successfully.</p>',
    'Your recent order has been delivered successfully.',
    'failed',
    2,
    'SMTP timeout while contacting upstream relay',
    NOW() - INTERVAL '2 minutes',
    NOW() - INTERVAL '4 hours',
    NOW() - INTERVAL '2 minutes'
  ),
  (
    '40000000-0000-4000-8000-000000000004',
    '30000000-0000-4000-8000-000000000002',
    'seller',
    'seller@technexus.local',
    '00000000-0000-4000-8000-000000000002',
    'Delivered order summary',
    '<p>The delivered order summary is attached for reconciliation.</p>',
    'The delivered order summary is attached for reconciliation.',
    'sent',
    1,
    NULL,
    NOW() - INTERVAL '4 days',
    NOW() - INTERVAL '4 days',
    NOW() - INTERVAL '4 days'
  )
ON CONFLICT (id) DO UPDATE
SET
  order_id = EXCLUDED.order_id,
  recipient_type = EXCLUDED.recipient_type,
  recipient_email = EXCLUDED.recipient_email,
  seller_id = EXCLUDED.seller_id,
  subject = EXCLUDED.subject,
  html = EXCLUDED.html,
  text = EXCLUDED.text,
  status = EXCLUDED.status,
  attempts = EXCLUDED.attempts,
  last_error = EXCLUDED.last_error,
  next_attempt_at = EXCLUDED.next_attempt_at,
  updated_at = EXCLUDED.updated_at;

INSERT INTO technexus.admin_activity_logs (id, admin_id, action, entity_type, entity_id, details, created_at)
VALUES
  (
    '60000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'seeded_demo_environment',
    'system',
    NULL,
    '{"source":"docker-init","environment":"development"}'::jsonb,
    NOW() - INTERVAL '1 hour'
  )
ON CONFLICT (id) DO UPDATE
SET
  action = EXCLUDED.action,
  details = EXCLUDED.details,
  created_at = EXCLUDED.created_at;
