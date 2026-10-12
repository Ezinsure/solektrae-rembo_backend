import cloudinary, { CLOUDINARY_FOLDER } from "../config/cloudinary";

export const imagePath = (...parts: string[]) => [CLOUDINARY_FOLDER, ...parts].join("/");

export const uploadImage = (buffer: Buffer, publicId: string): Promise<any> =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          public_id: publicId,
          overwrite: true,
          invalidate: true, 
          resource_type: "image",
          allowed_formats: ["jpg", "jpeg", "png", "webp"],
          transformation: [{ width: 800, height: 800, crop: "limit", quality: "auto" }],
        },
        (err, result) => (err ? reject(err) : resolve(result)),
      )
      .end(buffer);
  });

export const deleteImage = async (publicId: string) => {
  try {
    await cloudinary.uploader.destroy(publicId, { invalidate: true, resource_type: "image" });
  } catch (err) {
    console.error("Cloudinary delete failed:", publicId, err); 
  }
};