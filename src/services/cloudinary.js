export const cloudinaryConfig = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '',
  uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '',
};

export const cloudinaryConfigured = Boolean(cloudinaryConfig.cloudName && cloudinaryConfig.uploadPreset);

export async function uploadToCloudinary(file, folder = 'sigfrota') {
  if (!cloudinaryConfigured) {
    throw new Error('Cloudinary ainda não configurado. Preencha VITE_CLOUDINARY_CLOUD_NAME e VITE_CLOUDINARY_UPLOAD_PRESET.');
  }
  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', cloudinaryConfig.uploadPreset);
  body.append('folder', folder);

  const response = await fetch(
    'https://api.cloudinary.com/v1_1/' + cloudinaryConfig.cloudName + '/auto/upload',
    { method: 'POST', body }
  );
  if (!response.ok) throw new Error('Falha no upload para o Cloudinary.');
  const data = await response.json();
  return {
    url: data.secure_url,
    public_id: data.public_id,
    resource_type: data.resource_type,
    bytes: data.bytes,
    format: data.format,
    original_filename: data.original_filename,
  };
}
