import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
import path from "path";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadToCloudinary(
  fileBuffer: Buffer,
  originalName: string,
  folder: string = "general"
): Promise<string> {
  return new Promise((resolve, reject) => {
    const ext = path.extname(originalName || "").toLowerCase();
    const isPdf = ext === ".pdf";
    const baseName = path.basename(originalName || "file", ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    const uniqueId = `${Date.now()}-${baseName}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `se_internship/${folder}`,
        resource_type: "auto",
        public_id: uniqueId,
        format: isPdf ? "pdf" : undefined,
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          return reject(error);
        }
        if (!result || !result.secure_url) {
          return reject(new Error("Cloudinary upload did not return a secure_url"));
        }
        resolve(result.secure_url);
      }
    );
    uploadStream.end(fileBuffer);
  });
}

export { cloudinary };
module.exports = { cloudinary, uploadToCloudinary };
