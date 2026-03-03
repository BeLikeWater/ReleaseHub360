// ═══════════════════════════════════════════════
// ModuleDialog — Create / Edit module
// ═══════════════════════════════════════════════

import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { Module } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  productId: string;
  groupId: string;
  initial?: Module;
}

export default function ModuleDialog({ open, onClose, productId, groupId, initial }: Props) {
  const qc = useQueryClient();
  const isEdit = Boolean(initial?.id);
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');

  useEffect(() => {
    setName(initial?.name ?? '');
    setDescription(initial?.description ?? '');
  }, [initial]);

  const save = useMutation({
    mutationFn: () => {
      const payload = { name, description: description || undefined, productId, moduleGroupId: groupId };
      return isEdit
        ? apiClient.put(`/modules/${initial!.id}`, payload)
        : apiClient.post('/modules', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.moduleGroups.byProduct(productId) });
      onClose();
    },
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" key={initial?.id ?? 'new-mod'}>
      <DialogTitle>{isEdit ? 'Modülü Düzenle' : 'Yeni Modül'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        <TextField label="Modül Adı" fullWidth required value={name} onChange={(e) => setName(e.target.value)} />
        <TextField label="Açıklama" fullWidth value={description} onChange={(e) => setDescription(e.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>İptal</Button>
        <Button variant="contained" onClick={() => save.mutate()} disabled={!name || save.isPending}>
          {save.isPending ? <CircularProgress size={18} /> : (isEdit ? 'Kaydet' : 'Oluştur')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
