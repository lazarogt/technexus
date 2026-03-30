import assert from "node:assert/strict";
import test from "node:test";
import { allocateInventoryQuantities } from "../src/services/inventory.service";

test("allocateInventoryQuantities distributes stock across multiple locations", () => {
  const allocations = allocateInventoryQuantities(
    [
      { id: "loc-1", quantity: 2 },
      { id: "loc-2", quantity: 4 }
    ],
    5
  );

  assert.deepEqual(allocations, [
    { inventoryId: "loc-1", quantity: 2 },
    { inventoryId: "loc-2", quantity: 3 }
  ]);
});

test("allocateInventoryQuantities throws when stock is insufficient", () => {
  assert.throws(
    () =>
      allocateInventoryQuantities(
        [
          { id: "loc-1", quantity: 1 },
          { id: "loc-2", quantity: 1 }
        ],
        3
      ),
    /enough stock/i
  );
});

