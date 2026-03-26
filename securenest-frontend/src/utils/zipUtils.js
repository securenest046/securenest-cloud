import { BlobWriter, BlobReader, ZipWriter } from "@zip.js/zip.js";

// Generates a password-secured ZIP file buffer directly in the browser
export const createSecureZip = async (fileMeta, decryptedBlob, masterKey) => {
  const blobWriter = new BlobWriter("application/zip");
  
  // By providing a password, zip.js natively enacts standard zip encryption algorithms
  const zipWriter = new ZipWriter(blobWriter, { password: masterKey });
  
  await zipWriter.add(fileMeta.originalName, new BlobReader(decryptedBlob));
  await zipWriter.close();
  
  return await blobWriter.getData();
};

// Generates the phantom download element and triggers the secure zip save
export const downloadSecuredZip = async (fileMeta, decryptedBlob, masterKey) => {
  const zipBlob = await createSecureZip(fileMeta, decryptedBlob, masterKey);
  const zipUrl = URL.createObjectURL(zipBlob);
  
  const a = document.createElement('a');
  a.href = zipUrl;
  a.download = `${fileMeta.originalName}.locked.zip`;
  document.body.appendChild(a);
  a.click();
  
  // Cleanup browser memory to prevent leaks of large files
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(zipUrl), 5000);
};
