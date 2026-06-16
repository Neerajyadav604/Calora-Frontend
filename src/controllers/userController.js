const { uploadBufferToCloudinary } = require('../utils/cloudinaryUpload');

exports.uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.user?.uid) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Profile image is required',
      });
    }

    const result = await uploadBufferToCloudinary({
      buffer: req.file.buffer,
      folder: 'calora/profile-pictures',
      filename: `profile_${req.user.uid}`,
      mimetype: req.file.mimetype,
    });

    const imageUrl =
      result?.secure_url ||
      result?.secureUrl ||
      result?.url ||
      null;

    if (!imageUrl) {
      return res.status(500).json({
        success: false,
        message: 'Profile photo upload completed, but Cloudinary did not return an image URL',
        debug: {
          hasSecureUrl: Boolean(result?.secure_url),
          hasSecureUrlAlias: Boolean(result?.secureUrl),
          hasUrl: Boolean(result?.url),
          publicId: result?.public_id || null,
        },
      });
    }

    return res.status(200).json({
      success: true,
      imageUrl,
      url: imageUrl,
      publicId: result?.public_id || null,
      data: {
        imageUrl,
        url: imageUrl,
        publicId: result?.public_id || null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload profile photo',
    });
  }
};
