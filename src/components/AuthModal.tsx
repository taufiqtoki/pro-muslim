import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Tabs, Tab, Box } from '@mui/material';
import { useAuth } from '../hooks/useAuth.ts';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase.ts';

const AuthModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [tab, setTab] = useState(0);
  const { signIn, signUp } = useAuth();

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
  };

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
  };

  const handleConfirmPasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(event.target.value);
  };

  const handleFullNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFullName(event.target.value);
  };

  const handleLogin = async () => {
    try {
      await signIn(email, password);
      onClose();
    } catch (error) {
      console.error('Failed to sign in:', error);
    }
  };

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      console.error('Passwords do not match');
      return;
    }
    try {
      await signUp(email, password, fullName);
      onClose();
    } catch (error) {
      console.error('Failed to sign up:', error);
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      onClose();
    } catch (error) {
      console.error('Failed to sign in with Google:', error);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (tab === 0) {
      handleLogin();
    } else {
      handleSignUp();
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{tab === 0 ? 'লগইন' : 'নিবন্ধন করুন'}</DialogTitle>
      <Tabs value={tab} onChange={(_, newValue) => setTab(newValue)} centered>
        <Tab label="লগইন" />
        <Tab label="নিবন্ধন" />
      </Tabs>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {tab === 1 && (
            <TextField
              autoFocus
              margin="dense"
              label="পূর্ণ নাম"
              type="text"
              fullWidth
              value={fullName}
              onChange={handleFullNameChange}
              required
            />
          )}
          <TextField
            margin="dense"
            label="ইমেইল ঠিকানা"
            type="email"
            fullWidth
            value={email}
            onChange={handleEmailChange}
            required
          />
          <TextField
            margin="dense"
            label="পাসওয়ার্ড"
            type="password"
            fullWidth
            value={password}
            onChange={handlePasswordChange}
            required
          />
          {tab === 1 && (
            <TextField
              margin="dense"
              label="পাসওয়ার্ড নিশ্চিত করুন"
              type="password"
              fullWidth
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              required
            />
          )}
          {tab === 0 && (
            <Box mt={2}>
              <Button 
                variant="contained" 
                color="primary" 
                fullWidth 
                type="button"
                onClick={handleGoogleSignIn}
              >
                Google দিয়ে লগইন করুন
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} type="button">বাতিল করুন</Button>
          <Button type="submit">
            {tab === 0 ? 'লগইন করুন' : 'নিবন্ধন করুন'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AuthModal;
