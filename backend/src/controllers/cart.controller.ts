import { z } from "zod";
import { asyncHandler } from "../utils/async-handler";
import { addToCart, getCart, removeFromCart } from "../services/cart.service";

const addCartSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().positive()
});

const removeCartSchema = z.object({
  productId: z.string().uuid()
});

export const showCart = asyncHandler(async (req, res) => {
  const cart = await getCart(req.actor!);
  res.status(200).json(cart);
});

export const storeCartItem = asyncHandler(async (req, res) => {
  const payload = addCartSchema.parse(req.body);
  const cart = await addToCart(req.actor!, payload);
  res.status(200).json(cart);
});

export const destroyCartItem = asyncHandler(async (req, res) => {
  const payload = removeCartSchema.parse(req.body);
  const cart = await removeFromCart(req.actor!, payload.productId);
  res.status(200).json(cart);
});

