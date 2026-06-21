import { auth } from '../config/firebase';
import apiRequest from './api';

const getAuthToken = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be signed in to update nutrition targets.');
  }

  return await user.getIdToken();
};

export const updateProfileMacros = async ({
  targetCalories,
  protein,
  carbs,
  fats,
}) => {
  try {
    const token = await getAuthToken();
    return await apiRequest(
      '/profile/macros',
      'POST',
      {
        targetCalories,
        protein,
        carbs,
        fats,
      },
      token
    );
  } catch (error) {
    return {
      success: false,
      message: error?.message || 'Failed to update macros.',
    };
  }
};

export const resetProfileMacros = async () => {
  try {
    const token = await getAuthToken();
    return await apiRequest('/profile/macros/reset', 'POST', null, token);
  } catch (error) {
    return {
      success: false,
      message: error?.message || 'Failed to reset macros.',
    };
  }
};
