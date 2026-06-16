
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://calora-backend.onrender.com/api/v1';
// Replace YOUR_LOCAL_IP with your PC's local IP
// To find it: run "ipconfig" in terminal, look for IPv4 Address
// Example: http://192.168.1.5:5000/api/v1

const apiRequest = async (
  endpoint,
  method = 'GET',
  body = null,
  token = null,
  options = {}
) => {
  try {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const headers = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    if (isFormData) {
      return await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(method, `${BASE_URL}${endpoint}`, true);

        Object.entries(headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });

        xhr.onload = () => {
          try {
            const text = xhr.responseText || '{}';
            const data = JSON.parse(text);
            resolve(data);
          } catch (error) {
            reject(error);
          }
        };

        xhr.onerror = () => {
          reject(new Error('Network error. Please check your connection.'));
        };

        if (typeof options.onUploadProgress === 'function' && xhr.upload) {
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100);
              options.onUploadProgress(percent);
            }
          };
        }

        xhr.send(body);
      });
    }

    const config = {
      method,
      headers,
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    const data = await response.json();
    return data;

  } catch (error) {
    return {
      success: false,
      message: 'Network error. Please check your connection.',
    };
  }
};

export default apiRequest;
