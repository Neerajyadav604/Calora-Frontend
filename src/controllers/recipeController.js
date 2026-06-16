const Recipe = require('../models/Recipe');
const { deleteCloudinaryAsset, uploadBufferToCloudinary } = require('../utils/cloudinaryUpload');

const safeJsonParse = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizeRecipePayload = (body, file, user) => {
  const ingredients = safeJsonParse(body.ingredients, []);
  const instructions = safeJsonParse(body.instructions, []);
  const dietaryTags = safeJsonParse(body.dietaryTags, []);
  const perServing = safeJsonParse(body.perServing, {});

  return {
    title: body.title?.trim(),
    category: body.category?.trim(),
    cuisine: body.cuisine?.trim() || '',
    dietaryType: body.dietaryType,
    createdBy: user.uid,
    authorName: user.name || user.displayName || body.authorName || '',
    imageUrl: body.imageUrl || null,
    perServing: {
      calories: Number(perServing.calories || body.calories || 0),
      protein: Number(perServing.protein || body.protein || 0),
      carbs: Number(perServing.carbs || body.carbs || 0),
      fat: Number(perServing.fat || body.fat || 0),
    },
    servingSize: body.servingSize?.trim() || '',
    servings: Number(body.servings || 1),
    prepTime: Number(body.prepTime || 0),
    cookTime: Number(body.cookTime || 0),
    totalTime: Number(body.totalTime || 0),
    difficulty: body.difficulty,
    spiceLevel: body.spiceLevel,
    ingredients: Array.isArray(ingredients)
      ? ingredients.map((item) => (typeof item === 'string' ? { name: item } : item))
      : [],
    instructions: Array.isArray(instructions)
      ? instructions.map((item, index) => ({
          step: Number(item.step || index + 1),
          text: item.text || item.description || '',
        }))
      : [],
    dietaryTags: Array.isArray(dietaryTags) ? dietaryTags : [],
    _uploadedFile: file || null,
  };
};

exports.createRecipe = async (req, res) => {
  let uploadedAsset = null;

  try {
    if (!req.user?.uid) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const payload = normalizeRecipePayload(req.body, req.file, req.user);

    if (!payload.title || !payload.category || !payload.dietaryType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required recipe fields',
      });
    }

    if (payload._uploadedFile) {
      uploadedAsset = await uploadBufferToCloudinary({
        buffer: payload._uploadedFile.buffer,
        folder: 'calora/recipes',
        filename: payload._uploadedFile.originalname || `recipe_${Date.now()}`,
        mimetype: payload._uploadedFile.mimetype,
      });
      payload.imageUrl = uploadedAsset.secure_url;
    }

    delete payload._uploadedFile;

    const recipe = await Recipe.create(payload);

    return res.status(201).json({
      success: true,
      data: recipe,
    });
  } catch (error) {
    if (uploadedAsset?.public_id) {
      await deleteCloudinaryAsset(uploadedAsset.public_id);
    }

    const status = error?.name === 'ValidationError' ? 400 : 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to create recipe',
    });
  }
};
