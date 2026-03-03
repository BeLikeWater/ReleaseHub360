// ═══════════════════════════════════════════════
// ProductDetail — Product detail view with tabs
// ═══════════════════════════════════════════════

import { useState } from 'react';
import { Box, Typography, Chip, Divider, Tabs, Tab, Button } from '@mui/material';
import type { Product } from '@/types';
import StructureTab from './StructureTab';
import SettingsTab from './SettingsTab';

interface Props {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ProductDetail({ product, onEdit, onDelete }: Props) {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ p: 3, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="h6" fontWeight={700}>{product.name}</Typography>
            <Chip label={product.isActive ? 'Aktif' : 'Pasif'} color={product.isActive ? 'success' : 'default'} size="small" />
            {product.sourceControlType && (
              <Chip label={product.sourceControlType} size="small" variant="outlined" />
            )}
          </Box>
          {product.description && (
            <Typography variant="body2" color="text.secondary">{product.description}</Typography>
          )}
          {product.supportedArtifactTypes.length > 0 && (
            <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5 }}>
              {product.supportedArtifactTypes.map((t) => (
                <Chip key={t} label={t} size="small" variant="outlined" color="info" sx={{ height: 20, fontSize: '0.7rem' }} />
              ))}
            </Box>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          <Button size="small" variant="outlined" onClick={onEdit}>Düzenle</Button>
          <Button size="small" variant="outlined" color="error" onClick={onDelete}>Sil</Button>
        </Box>
      </Box>

      <Divider />

      {/* ── Tabs ── */}
      <Tabs
        value={tab} onChange={(_, v) => setTab(v)}
        sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5 } }}
      >
        <Tab label="Yapı" />
        <Tab label="Ürün Ayarları" />
      </Tabs>

      {tab === 0 && <StructureTab productId={product.id} />}
      {tab === 1 && <SettingsTab product={product} onUpdated={() => setTab(0)} />}
    </Box>
  );
}
