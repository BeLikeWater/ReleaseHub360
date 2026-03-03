// ═══════════════════════════════════════════════
// ServiceRow — Compact inline row for a service within the structure tree
// ═══════════════════════════════════════════════

import { Box, Typography, Chip, IconButton, Menu, MenuItem } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { useState } from 'react';
import type { Service } from '@/types';

interface ServiceRowProps {
  service: Service;
  onEdit: (s: Service) => void;
  onDelete: (s: Service) => void;
}

function RowMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  return (
    <>
      <IconButton size="small" onClick={(e) => { e.stopPropagation(); setAnchor(e.currentTarget); }}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem onClick={() => { onEdit(); setAnchor(null); }}>Düzenle</MenuItem>
        <MenuItem onClick={() => { onDelete(); setAnchor(null); }} sx={{ color: 'error.main' }}>Sil</MenuItem>
      </Menu>
    </>
  );
}

export default function ServiceRow({ service, onEdit, onDelete }: ServiceRowProps) {
  const version = service.lastProdReleaseName ?? service.currentVersion;

  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1.5, px: 3, py: 0.75,
      borderTop: '1px solid', borderColor: 'divider',
      '&:hover': { bgcolor: 'action.hover' },
    }}>
      <FiberManualRecordIcon
        sx={{ fontSize: 10, color: service.isActive ? 'success.main' : 'text.disabled', flexShrink: 0 }}
      />
      <Typography variant="body2" fontWeight={600} sx={{ minWidth: 180, flexShrink: 0 }}>
        {service.name}
      </Typography>
      {service.repoName && (
        <Typography variant="caption" color="text.secondary" fontFamily="monospace" sx={{ flexShrink: 0 }}>
          {service.repoName}
        </Typography>
      )}
      {service.pipelineName && service.pipelineName !== service.repoName && (
        <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0 }}>
          pipe: {service.pipelineName}
        </Typography>
      )}
      {service.prodStageName && (
        <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0 }}>
          stage: {service.prodStageName}
        </Typography>
      )}
      {service.releaseProject && (
        <Chip
          label={`proj: ${service.releaseProject}`}
          size="small"
          variant="outlined"
          color="warning"
          sx={{ height: 20, fontSize: '0.7rem', flexShrink: 0 }}
        />
      )}
      <Box flex={1} />
      {version && (
        <Chip
          label={`v${version}`}
          size="small" color="primary" variant="outlined"
          sx={{ height: 20, fontSize: '0.7rem', flexShrink: 0 }}
        />
      )}
      <RowMenu onEdit={() => onEdit(service)} onDelete={() => onDelete(service)} />
    </Box>
  );
}
