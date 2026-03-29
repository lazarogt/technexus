import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import multer from "multer";
import type { Request, Response } from "express";

const uploadsDirectory = path.join(process.cwd(), "uploads");
const acceptedImageMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    ensureUploadsDirectory();
    callback(null, uploadsDirectory);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${randomUUID()}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: {
    files: 5,
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (_req, file, callback) => {
    if (!acceptedImageMimeTypes.has(file.mimetype)) {
      callback(new Error("Only JPG, PNG, WEBP and GIF images are allowed."));
      return;
    }

    callback(null, true);
  }
});

export const ensureUploadsDirectory = (): void => {
  fs.mkdirSync(uploadsDirectory, { recursive: true });
};

export const toStoredImagePaths = (
  files: Express.Multer.File[]
): string[] => {
  return files.map((file) => `/uploads/${file.filename}`);
};

export const deleteStoredFiles = async (storedPaths: string[]): Promise<void> => {
  await Promise.all(
    storedPaths.map(async (storedPath) => {
      const safeFileName = path.basename(storedPath);
      const absolutePath = path.join(uploadsDirectory, safeFileName);

      try {
        await fs.promises.unlink(absolutePath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          console.error(`Unable to remove uploaded file ${absolutePath}:`, error);
        }
      }
    })
  );
};

export const runProductImageUpload = (
  req: Request,
  res: Response
): Promise<void> => {
  return new Promise((resolve, reject) => {
    upload.array("images", 5)(req, res, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
};
