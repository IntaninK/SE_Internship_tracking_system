require("dotenv").config();
const cloudinary = require("cloudinary").v2;
const path = require("path");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadToCloudinary(fileBuffer, originalName, folder = "general") {
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
        resolve(result.secure_url);
      }
    );
    uploadStream.end(fileBuffer);
  });
}

module.exports = { cloudinary, uploadToCloudinary };
