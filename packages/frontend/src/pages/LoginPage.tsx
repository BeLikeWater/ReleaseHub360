import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, TextField, Button, Alert, CircularProgress, Tabs, Tab } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import apiClient from '@/api/client';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [tab, setTab] = useState(0); // 0=kurum, 1=müşteri
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const endpoint = tab === 0 ? '/auth/login' : '/auth/customer-login';
      const res = await apiClient.post(endpoint, { email, password });
      const { user, accessToken, refreshToken } = res.data.data;
      login(user, accessToken, refreshToken);
      navigate('/');
    } catch {
      setError('E-posta veya şifre hatalı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
      <Paper elevation={3} sx={{ p: 4, width: 400, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Box sx={{ bgcolor: 'primary.main', borderRadius: '50%', p: 1.5, mb: 1, color: 'white' }}>
            <LockOutlinedIcon />
          </Box>
          <Typography variant="h5" fontWeight={700}>ReleaseHub360</Typography>
          <Typography variant="body2" color="text.secondary">Hesabınıza giriş yapın</Typography>
        </Box>

        <Tabs value={tab} onChange={(_, v) => { setTab(v); setError(''); }}
          variant="fullWidth" sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Tab icon={<BusinessIcon fontSize="small" />} iconPosition="start" label="Kurum Girişi" />
          <Tab icon={<PersonIcon fontSize="small" />} iconPosition="start" label="Müşteri Girişi" />
        </Tabs>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            label="E-posta" type="email" fullWidth required margin="normal"
            value={email} onChange={(e) => setEmail(e.target.value)} autoFocus
          />
          <TextField
            label="Şifre" type="password" fullWidth required margin="normal"
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" fullWidth variant="contained" size="large" sx={{ mt: 2 }} disabled={loading}>
            {loading ? <CircularProgress size={22} color="inherit" /> : 'Giriş Yap'}
          </Button>
        </Box>

        {tab === 1 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
            Müşteri erişim bilgileriniz hesap yöneticiniz tarafından oluşturulur.
          </Typography>
        )}
      </Paper>
    </Box>
  );
}
