const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export async function uploadImageToCloudinary(
  file: File,
  folder = 'paguyuban-bani-p3n'
): Promise<string> {
  if (!CLOUD_NAME) {
    throw new Error('VITE_CLOUDINARY_CLOUD_NAME belum dikonfigurasi.');
  }

  if (!UPLOAD_PRESET) {
    throw new Error('VITE_CLOUDINARY_UPLOAD_PRESET belum dikonfigurasi.');
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('File yang dipilih harus berupa gambar.');
  }

  const maxSize = 5 * 1024 * 1024;

  if (file.size > maxSize) {
    throw new Error('Ukuran gambar maksimal 5 MB.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error('Cloudinary upload error:', data);
    throw new Error(
      data?.error?.message || 'Gagal mengunggah gambar ke Cloudinary.'
    );
  }

  if (!data.secure_url) {
    throw new Error('Cloudinary tidak mengembalikan URL gambar.');
  }

  return data.secure_url;
}
