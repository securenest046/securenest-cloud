/**
 * Client-Side Encryption Core
 * Built exclusively using the native Web Crypto API (AES-GCM).
 * Converts raw files into encrypted ArrayBuffers before cloud transmission.
 */

// Helper to convert the 40-character database string into a valid CryptoKey
async function importKey(rawKeyString) {
    const enc = new TextEncoder();
    // We pad or truncate the 40-char string to exactly 32 bytes (256 bits) for AES-256
    const keyData = enc.encode(rawKeyString).slice(0, 32); 

    return await window.crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"]
    );
}

// Encrypt File payload returning iv and cipher blob
export async function encryptFileForUpload(file, keyString) {
    const key = await importKey(keyString);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const fileBuffer = await file.arrayBuffer();

    const encryptedContent = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        key,
        fileBuffer
    );

    // Return the blob to upload to Telegram, and the IV to save in MongoDB
    return {
        cipherBlob: new Blob([encryptedContent]),
        iv: Array.from(iv) // Convert to array to easily serialize in JSON/MongoDB
    };
}

// Decrypt Telegram blob back into the original file inside user's browser
export async function decryptFileForDownload(encryptedBuffer, keyString, ivArray, originalMimeType) {
    const key = await importKey(keyString);
    const iv = new Uint8Array(ivArray);

    const decryptedContent = await window.crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        key,
        encryptedBuffer
    );

    return new Blob([decryptedContent], { type: originalMimeType });
}
