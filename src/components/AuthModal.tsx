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

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{tab === 0 ? 'Login' : 'Sign Up'}</DialogTitle>
      <Tabs value={tab} onChange={(_, newValue) => setTab(newValue)} centered>
        <Tab label="Login" />
        <Tab label="Sign Up" />
      </Tabs>
      <DialogContent>
        {tab === 1 && (
          <TextField
            autoFocus
            margin="dense"
            label="Full Name"
            type="text"
            fullWidth
            value={fullName}
            onChange={handleFullNameChange}
          />
        )}
        <TextField
          margin="dense"
          label="Email Address"
          type="email"
          fullWidth
          value={email}
          onChange={handleEmailChange}
        />
        <TextField
          margin="dense"
          label="Password"
          type="password"
          fullWidth
          value={password}
          onChange={handlePasswordChange}
        />
        {tab === 1 && (
          <TextField
            margin="dense"
            label="Confirm Password"
            type="password"
            fullWidth
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
          />
        )}
        {tab === 0 && (
          <Box mt={2}>
            <Button variant="contained" color="primary" fullWidth onClick={handleGoogleSignIn}>
              Sign in with Google
            </Button>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {tab === 0 ? (
          <Button onClick={handleLogin}>Login</Button>
        ) : (
          <Button onClick={handleSignUp}>Sign Up</Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AuthModal;
