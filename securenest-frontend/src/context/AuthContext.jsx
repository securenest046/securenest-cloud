import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import Loader from '../components/Loader';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  updatePassword,
  updateProfile,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);

  // Note: The prompt instructed that users can reset password by their 'user-id'.
  // In Firebase, Email acts as the universally unique User ID.
  const signup = async (email, password, fullName) => {
    const userCredentials = await createUserWithEmailAndPassword(auth, email, password);
    if (fullName) {
        await updateProfile(userCredentials.user, { displayName: fullName });
    }
    return userCredentials;
  };

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = () => {
    return signOut(auth);
  };

  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  const loginWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  };

  const updateUserPassword = async (oldPassword, newPassword) => {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user found.");
    
    const credential = EmailAuthProvider.credential(user.email, oldPassword);
    await reauthenticateWithCredential(user, credential);
    return updatePassword(user, newPassword);
  };

  const reauthenticate = async (password) => {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user found.");
    const credential = EmailAuthProvider.credential(user.email, password);
    return reauthenticateWithCredential(user, credential);
  };

  const updateUserProfile = async (fullName) => {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user found.");
    return updateProfile(user, { displayName: fullName });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    logout,
    resetPassword,
    loginWithGoogle,
    reauthenticate,
    updateUserPassword,
    updateUserProfile,
    isSwitching,
    setIsSwitching
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? <Loader fullScreen={true} message="Loading..." /> : children}
    </AuthContext.Provider>
  );
};
