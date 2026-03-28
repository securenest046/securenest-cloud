/**
 * Biometric & Platform-Native Identity Gateway 🛡️🧬
 * 
 * This utility leverages the Web Authentication API (WebAuthn) to trigger 
 * OS-level identity verification (FaceID, TouchID, Windows Hello, or System PIN).
 */

export const triggerPlatformAuth = async () => {
  // 1. Check for hardware & platform support
  if (!window.PublicKeyCredential) {
    throw new Error("REAUTH_UNSUPPORTED");
  }

  try {
    const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!isAvailable) {
      throw new Error("REAUTH_UNAVAILABLE");
    }

    // 2. Construct a dummy cryptographic challenge to trigger the native prompt
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const options = {
      publicKey: {
        challenge,
        rp: { 
          name: "SecureVault Cryptographic Registry",
          id: window.location.hostname === "localhost" ? undefined : window.location.hostname
        },
        user: {
          id: new Uint8Array(16), // Anonymous context
          name: "vault-integrity-check",
          displayName: "SecureVault Identity Verification"
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }], // ES256
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required"
        },
        timeout: 60000,
        attestation: "none"
      }
    };

    /**
     * TRIGGER OS PROMPT 🛡️
     * This will open the native FaceID (iOS), Windows Hello (Windows), 
     * or Fingerprint (Android/macOS) interface.
     */
    await navigator.credentials.create(options);
    
    // If the creation call resolves without error, the user has successfully 
    // authenticated with their system's biometric or security hardware.
    return true;
  } catch (err) {
    console.error("Platform Identity Verification Failed:", err);
    
    // If the user cancelled the prompt, we should bubble that up specifically
    if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
      throw new Error("REAUTH_CANCELLED");
    }
    
    throw new Error("REAUTH_FAILED");
  }
};
