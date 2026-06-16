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
  const fileName = cleanUri.split('/').pop() || `profile_${Date.now()}.jpg`;
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

export const uploadProfilePhoto = async (imageUri, onUploadProgress) => {
  const token = await getAuthToken();
  const formData = new FormData();

  formData.append('image', {
    uri: imageUri,
    name: getFileNameFromUri(imageUri),
    type: getMimeTypeFromUri(imageUri),
  });

  const response = await apiRequest('/users/profile-photo', 'POST', formData, token, {
    onUploadProgress,
  });

  const imageUrl =
    response?.imageUrl ||
    response?.data?.imageUrl ||
    response?.data?.url ||
    response?.url ||
    response?.photoURL ||
    response?.secure_url ||
    null;

  return {
    ...response,
    imageUrl,
  };
};
