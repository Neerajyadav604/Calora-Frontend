const { Readable } = require('stream');
const cloudinary = require('../config/cloudinary');

const uploadBufferToCloudinary = ({ buffer, folder, filename, mimetype }) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        public_id: filename,
        overwrite: false,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    Readable.from(buffer).pipe(uploadStream);
  });
};

const deleteCloudinaryAsset = async (publicId) => {
  if (!publicId) return null;
  return await cloudinary.uploader.destroy(publicId, {
    resource_type: 'image',
    invalidate: true,
  });
};

module.exports = {
  uploadBufferToCloudinary,
  deleteCloudinaryAsset,
};
