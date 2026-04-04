# Demo Mode

Run demo mode from the backend workspace:

`npm run db:demo`

This workflow:

- preserves all existing users and never deletes the admin
- safely resets marketplace demo data only
- promotes safe existing users to seller when fewer than five sellers are available
- seeds realistic categories, products, reviews, orders, analytics events, and outbox rows

Reset tables:

- `OrderItem`, `Order`, `EmailOutbox`
- `LowStockAlert`, `Inventory`, `ProductImage`
- `CartItem`
- `Review`
- `Product`, `Category`
- `AnalyticsEvent`

Preserved tables:

- `User`
- `Location`
- `Cart`
- `GuestSession`
