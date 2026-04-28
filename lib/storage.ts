/**
 * Cloudinary Storage Utility
 * Used as an alternative to Firebase Storage
 */

export const uploadFile = async (
  file: File, 
  path: string, 
  onProgress?: (progress: number) => void
): Promise<string> => {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    console.error("Cloudinary Config Missing:", { cloudName: !!cloudName, uploadPreset: !!uploadPreset });
    throw new Error("Cloudinary configuration missing. Please check your .env.local file.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", path.split('/')[0]); // Use the first part of the path as folder

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/upload`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        resolve(response.secure_url);
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          const msg = error.error?.message || "Upload to Cloudinary failed";
          if (msg.includes("Upload preset not found")) {
            reject(new Error(`Cloudinary Error: Preset '${uploadPreset}' not found or not set to 'Unsigned'.`));
          } else {
            reject(new Error(msg));
          }
        } catch (e) {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(formData);
  });
};

export const deleteFile = async (url: string) => {
  console.warn("Delete not implemented for Cloudinary unsigned uploads (for security).");
};
