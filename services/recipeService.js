import apiRequest from './api';
import { auth } from '../config/firebase';

const getAuthToken = async () => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('User not authenticated');
  }

  return await user.getIdToken();
};

const getFileNameFromUri = (uri) => {
  const cleanUri = (uri || '').split('?')[0];
  const fileName = cleanUri.split('/').pop() || `recipe_${Date.now()}.jpg`;
  return fileName.includes('.') ? fileName : `${fileName}.jpg`;
};

const getMimeTypeFromUri = (uri) => {
  const extension = getFileNameFromUri(uri).split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
    default:
      return 'image/jpeg';
  }
};

const appendRecipeField = (formData, key, value) => {
  if (value === undefined || value === null) return;

  if (Array.isArray(value) || typeof value === 'object') {
    formData.append(key, JSON.stringify(value));
    return;
  }

  formData.append(key, String(value));
};

const buildRecipeFormData = (recipeData, imageUri) => {
  const formData = new FormData();

  Object.entries(recipeData || {}).forEach(([key, value]) => {
    appendRecipeField(formData, key, value);
  });

  if (imageUri) {
    formData.append('image', {
      uri: imageUri,
      name: getFileNameFromUri(imageUri),
      type: getMimeTypeFromUri(imageUri),
    });
  }

  return formData;
};

export const getFeaturedRecipes = async () => {
  return await apiRequest('/recipes/featured');
};

export const getTraditionalRecipes = async () => {
  return await apiRequest('/recipes/traditional');
};

export const getQuickRecipes = async () => {
  return await apiRequest('/recipes/quick');
};

export const searchRecipes = async (query) => {
  try {
    if (!query?.trim()) {
      return { success: true, data: [] };
    }

    const encodedQuery = encodeURIComponent(query.trim());
    return await apiRequest(`/recipes/search?q=${encodedQuery}`);
  } catch (error) {
    return { success: false, message: 'Search failed' };
  }
};

export const filterRecipes = async ({ tag = '', dietaryType = '' }) => {
  try {
    const params = new URLSearchParams();

    if (tag) params.append('tag', tag);
    if (dietaryType) params.append('dietaryType', dietaryType);

    return await apiRequest(`/recipes/filter?${params.toString()}`);
  } catch (error) {
    return { success: false, message: 'Failed to filter recipes' };
  }
};

export const getRecipeById = async (recipeId) => {
  try {
    if (!recipeId) {
      return { success: false, message: 'Recipe ID is required' };
    }

    return await apiRequest(`/recipes/${recipeId}`);
  } catch (error) {
    return { success: false, message: 'Failed to fetch recipe' };
  }
};

export const createRecipe = async (recipeData) => {
  try {
    const token = await getAuthToken();
    return await apiRequest('/recipes', 'POST', recipeData, token);
  } catch (error) {
    console.log('Create recipe error:', error);

    return {
      success: false,
      message: error.message || 'Failed to create recipe',
    };
  }
};

export const updateRecipe = async (recipeId, updatedData) => {
  try {
    const token = await getAuthToken();
    return await apiRequest(`/recipes/${recipeId}`, 'PUT', updatedData, token);
  } catch (error) {
    console.log('Update recipe error:', error);

    return {
      success: false,
      message: 'Failed to update recipe',
    };
  }
};

export const deleteRecipe = async (recipeId) => {
  try {
    const token = await getAuthToken();
    return await apiRequest(`/recipes/${recipeId}`, 'DELETE', null, token);
  } catch (error) {
    console.log('Delete recipe error:', error);

    return {
      success: false,
      message: 'Failed to delete recipe',
    };
  }
};

export const saveRecipe = async (recipeId) => {
  try {
    const token = await getAuthToken();
    return await apiRequest(`/recipes/${recipeId}/save`, 'POST', null, token);
  } catch (error) {
    console.log('Save recipe error:', error);

    return {
      success: false,
      message: 'Failed to save recipe',
    };
  }
};

export const unsaveRecipe = async (recipeId) => {
  try {
    const token = await getAuthToken();
    return await apiRequest(`/recipes/${recipeId}/unsave`, 'POST', null, token);
  } catch (error) {
    console.log('Unsave recipe error:', error);

    return {
      success: false,
      message: 'Failed to unsave recipe',
    };
  }
};

export const createRecipeWithImage = async ({
  imageUri,
  recipeData,
  onUploadProgress,
}) => {
  try {
    const token = await getAuthToken();
    const formData = buildRecipeFormData(recipeData, imageUri);

    // Frontend only uploads the file to the backend; image hosting happens server-side.
    return await apiRequest('/recipes', 'POST', formData, token, {
      onUploadProgress,
    });
  } catch (error) {
    console.log('Create recipe with image error:', error);

    return {
      success: false,
      message: 'Failed to create recipe',
    };
  }
};
