import { z } from "zod";
import { asyncHandler } from "../utils/async-handler";
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory
} from "../services/category.service";
import { categoryListQuerySchema, idParamSchema } from "../utils/request-validation";

const categorySchema = z.object({
  name: z.string().trim().min(2)
});

export const indexCategories = asyncHandler(async (req, res) => {
  const query = categoryListQuerySchema.parse(req.query);
  const response = await listCategories({
    page: query.page,
    limit: query.limit ?? query.pageSize
  });
  res.status(200).json(response);
});

export const storeCategory = asyncHandler(async (req, res) => {
  const payload = categorySchema.parse(req.body);
  const category = await createCategory(payload.name);
  res.status(201).json({ category });
});

export const updateManagedCategory = asyncHandler(async (req, res) => {
  const params = idParamSchema.parse(req.params);
  const payload = categorySchema.parse(req.body);
  const category = await updateCategory(params.id, payload.name);
  res.status(200).json({ category });
});

export const destroyCategory = asyncHandler(async (req, res) => {
  const params = idParamSchema.parse(req.params);
  await deleteCategory(params.id);
  res.status(200).json({ message: "Category deleted successfully." });
});
