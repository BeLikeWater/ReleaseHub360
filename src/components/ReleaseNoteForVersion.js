import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Avatar,
  List,
  ListItem,
  CircularProgress,
  Divider,
  Alert,
  Card,
  CardContent,
  IconButton
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const ReleaseNoteForVersion = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const release = location.state?.release;

  const [releaseNotes, setReleaseNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReleaseNotes = async () => {
      if (!release) {
        setLoading(false);
        return;
      }

      try {
        // Fetch all release notes from masterVersionReleaseNotes collection
        const notesRef = collection(db, 'masterVersionReleaseNotes');
        const notesSnapshot = await getDocs(notesRef);
        
        const notes = [];
        notesSnapshot.forEach(doc => {
          const data = doc.data();
          // Filter out empty notes
          if (data.title?.trim() && data.description?.trim()) {
            notes.push({
              id: doc.id,
              title: data.title,
              description: data.description
            });
          }
        });

        setReleaseNotes(notes);
      } catch (error) {
        console.error('Error fetching release notes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReleaseNotes();
  }, [release]);

  if (!release) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Release bilgisi bulunamadı. Lütfen geri dönüp tekrar deneyin.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              Release Notları
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {release.productName} - {release.version}
            </Typography>
          </Box>
        </Box>

        {/* Release Info */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
          <Chip
            avatar={<Avatar sx={{ bgcolor: 'primary.main' }}>{release.version.charAt(0)}</Avatar>}
            label={`Version: ${release.version}`}
            variant="outlined"
            color="primary"
          />
          {release.publishDate && (
            <Chip
              label={`Tarih: ${new Date(release.publishDate.seconds * 1000).toLocaleDateString('tr-TR')}`}
              variant="outlined"
            />
          )}
          {release.isHotfix && (
            <Chip
              label="Hotfix"
              color="error"
              variant="outlined"
            />
          )}
        </Box>
      </Paper>

      {/* Release Notes Content */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : releaseNotes.length === 0 ? (
        <Alert severity="info" icon={<DescriptionIcon />}>
          Bu release için henüz not eklenmemiş.
        </Alert>
      ) : (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {releaseNotes.length} Not
          </Typography>
          
          <List sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {releaseNotes.map((note, index) => (
              <Card key={note.id} variant="outlined">
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                    {note.title}
                  </Typography>
                  
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {note.description}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </List>
        </Box>
      )}
    </Box>
  );
};

export default ReleaseNoteForVersion;
