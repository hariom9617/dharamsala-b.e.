// utils/s3Manager.js — Centralized AWS S3 image manager
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import multer from "multer";
import multerS3 from "multer-s3";
import crypto from "crypto";
import { BadRequestError } from "./errors.js";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Lazy singletons — created on first use so dotenv has loaded by then
let _s3;
let _bucket;

function getS3() {
  if (!_s3) {
    _s3 = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
  }
  return _s3;
}

function getBucket() {
  if (!_bucket) {
    _bucket = process.env.AWS_S3_BUCKET_NAME;
  }
  return _bucket;
}

/**
 * Factory: creates a multer upload middleware for a given folder type.
 * Key format: {hotelId}/{folder}/{timestamp}-{uuid}-{originalname}
 */
export function createUpload(folder) {
  // Return a wrapper that lazily builds multer on first request
  let _upload;

  return (req, res, next) => {
    if (!_upload) {
      _upload = multer({
        storage: multerS3({
          s3: getS3(),
          bucket: getBucket(),
          contentType: multerS3.AUTO_CONTENT_TYPE,
          key(req, file, cb) {
            const hotelId = req.user?.hotelId;
            if (!hotelId) {
              return cb(new BadRequestError("Hotel context required for upload"));
            }
            const uniqueName = `${Date.now()}-${crypto.randomUUID()}-${file.originalname}`;
            cb(null, `${hotelId}/${folder}/${uniqueName}`);
          }
        }),
        fileFilter(_req, file, cb) {
          if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            cb(null, true);
          } else {
            cb(new BadRequestError("Only JPEG, PNG and WebP images are allowed"));
          }
        },
        limits: { fileSize: MAX_FILE_SIZE }
      }).single("image");
    }

    _upload(req, res, next);
  };
}

/**
 * Delete an object from S3 given its full URL.
 * Extracts the key from the URL and issues a DeleteObjectCommand.
 */
export async function deleteS3Object(imageUrl) {
  if (!imageUrl) return;

  try {
    // URL format: https://{bucket}.s3.{region}.amazonaws.com/{key}
    const url = new URL(imageUrl);
    const key = decodeURIComponent(url.pathname.slice(1)); // remove leading '/'

    await getS3().send(new DeleteObjectCommand({ Bucket: getBucket(), Key: key }));
  } catch (err) {
    // Log but don't throw — image deletion should not break the main operation
    console.error(`Failed to delete S3 object: ${imageUrl}`, err.message);
  }
}

// Pre-configured convenience middleware for menu images
export const uploadMenuImage = createUpload("menu");
