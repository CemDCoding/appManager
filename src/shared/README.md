# src/shared

Contracts shared by main, preload, renderer and core: zod schemas, derived types, IPC contract. No calculation logic.

Conventions:

- Money is `{ cents, currency }`. `cents` is a non-negative safe integer. Rates are decimal strings ("0.92"), never numbers; EUR bookings have `rateToEur: "1"`.
- Dates are `YYYY-MM-DD` strings (calendar dates, no timezone). `createdAt`/`updatedAt` are ISO datetimes.
- Percentages are basis points (10 000 = 100 %). `percent` allocations must sum to 10 000; `equal` allocations use `percentBasisPoints: 0`; `mode: 'all'` has empty `shares`.
- Every entity has `id` (UUID), `ownerId` (`'local'`), `createdAt`, `updatedAt`. Main sets them; `EntityInput<C>` is the entity without them.
- Categories, platforms, formats are stable keys (`lists.ts`); the UI translates them. Custom entries live in settings and can only be added or hidden.
- Persons hold only name, role, status, note (PE-09/PE-36). Do not add personal fields.
- Collection files: `{ schemaVersion: 1, items: [] }`, see `collections.ts`; `parseCollectionFile` validates, never repairs.
- IPC: `IpcResult<T>` is `{ ok: true, data }` or `{ ok: false, error: { code, message } }`. The renderer never passes file paths.
