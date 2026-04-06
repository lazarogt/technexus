import fs from "node:fs";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { env } from "../utils/config";

const acceptedMimeTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"]
]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    fs.mkdirSync(env.uploadsDir, { recursive: true });
    callback(null, env.uploadsDir);
  },
  filename: (_req, file, callback) => {
    const extension = acceptedMimeTypes.get(file.mimetype);

    if (!extension) {
      callback(new Error("Only JPG, PNG, WEBP and GIF images are allowed."), "");
      return;
    }

    callback(null, `${randomUUID()}${extension}`);
  }
});

export const productImageUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5
  },
  fileFilter: (_req, file, callback) => {
    if (!acceptedMimeTypes.has(file.mimetype)) {
      callback(new Error("Only JPG, PNG, WEBP and GIF images are allowed."));
      return;
    }

    callback(null, true);
  }
});
