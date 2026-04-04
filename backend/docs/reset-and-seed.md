# Reset And Seed

`npm run db:reset-seed`

This command applies pending Prisma migrations, clears marketplace catalog and order data, and reseeds the database with a realistic tech catalog.

It resets:

- `OrderItem`, `Order`, `EmailOutbox`
- `LowStockAlert`, `Inventory`, `ProductImage`
- `CartItem`
- `Product`, `Category`
- `Review` if that table exists in the current database

It preserves:

- every existing `User`
- the global admin account
- existing seller or admin accounts used as product owners
- existing `Location` rows, reusing the earliest active location for the chosen seller when possible

Seller assignment behavior:

- use the first active `seller`
- if no seller exists, use the configured admin account
- never create new users

The seeded catalog creates the categories `Laptops`, `PC Components`, `Monitors`, and `Accessories`, then inserts 20+ products with images, inventory, deterministic stock values, and realistic USD pricing.
