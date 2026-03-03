// ═══════════════════════════════════════════════
// StructureTab — ModuleGroup → Module → Service tree view
// ═══════════════════════════════════════════════

import { useState, useMemo } from 'react';
import {
  Box, Typography, Button, Chip, CircularProgress, Alert,
  Accordion, AccordionSummary, AccordionDetails, Collapse, IconButton, Menu, MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { ConfirmDialog } from '@/components/shared';
import type { Module, ModuleGroup, Service } from '@/types';
import ServiceRow from './ServiceRow';
import ModuleGroupDialog from './ModuleGroupDialog';
import ModuleDialog from './ModuleDialog';
import ServiceDialog from './ServiceDialog';

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

export default function StructureTab({ productId }: { productId: string }) {
  const qc = useQueryClient();
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [groupDialog, setGroupDialog] = useState<{ open: boolean; initial?: ModuleGroup }>({ open: false });
  const [moduleDialog, setModuleDialog] = useState<{ groupId: string; initial?: Module } | null>(null);
  const [serviceDialog, setServiceDialog] = useState<{ defaultModuleId?: string | null; initial?: Service } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'group' | 'module' | 'service'; item: { id: string; name: string } } | null>(null);

  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: queryKeys.moduleGroups.byProduct(productId),
    queryFn: async () => (await apiClient.get(`/modules/groups?productId=${productId}`)).data.data as ModuleGroup[],
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: queryKeys.services.byProduct(productId),
    queryFn: async () => (await apiClient.get(`/services?productId=${productId}`)).data.data as Service[],
  });

  const allModules = useMemo(() => groups.flatMap((g) => g.modules ?? []), [groups]);

  const servicesByModule = useMemo(() => {
    const map = new Map<string, Service[]>();
    for (const s of services) {
      const key = s.moduleId ?? '__none__';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [services]);

  const deleteGroupMut = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/modules/groups/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.moduleGroups.byProduct(productId) }); setDeleteTarget(null); },
  });
  const deleteModuleMut = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/modules/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.moduleGroups.byProduct(productId) }); setDeleteTarget(null); },
  });
  const deleteServiceMut = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/services/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.services.byProduct(productId) }); setDeleteTarget(null); },
  });

  const toggleModule = (id: string) => setExpandedModules((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'group') deleteGroupMut.mutate(deleteTarget.item.id);
    if (deleteTarget.type === 'module') deleteModuleMut.mutate(deleteTarget.item.id);
    if (deleteTarget.type === 'service') deleteServiceMut.mutate(deleteTarget.item.id);
  };

  if (groupsLoading || servicesLoading) return <CircularProgress size={24} sx={{ mt: 2 }} />;

  const unassigned = servicesByModule.get('__none__') ?? [];

  return (
    <>
      {groups.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Henüz modül grubu tanımlanmamış. Aşağıdaki butonla yapıyı oluşturmaya başlayın.
        </Alert>
      )}

      {groups.map((group) => (
        <Accordion key={group.id} disableGutters variant="outlined" sx={{ mb: 1, '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, mr: 1 }}>
              <Typography fontWeight={700}>{group.name}</Typography>
              <Chip label={`${group.modules?.length ?? 0} modül`} size="small" variant="outlined" />
            </Box>
            <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <Button size="small" startIcon={<AddIcon />}
                onClick={() => setModuleDialog({ groupId: group.id })}>
                Modül
              </Button>
              <RowMenu
                onEdit={() => setGroupDialog({ open: true, initial: group })}
                onDelete={() => setDeleteTarget({ type: 'group', item: group })}
              />
            </Box>
          </AccordionSummary>

          <AccordionDetails sx={{ p: 0 }}>
            {(group.modules ?? []).length === 0 && (
              <Typography variant="caption" color="text.disabled" sx={{ px: 2, py: 1, display: 'block' }}>
                Bu gruba henüz modül eklenmemiş.
              </Typography>
            )}

            {(group.modules ?? []).map((mod) => {
              const modServices = servicesByModule.get(mod.id) ?? [];
              const isExpanded = expandedModules.has(mod.id);
              return (
                <Box key={mod.id} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                  <Box
                    onClick={() => toggleModule(mod.id)}
                    sx={{
                      display: 'flex', alignItems: 'center', px: 2, py: 1,
                      bgcolor: 'grey.50', cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <IconButton size="small" sx={{ mr: 0.5, p: 0.25 }}>
                      {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </IconButton>
                    <Typography variant="body2" fontWeight={600} flex={1}>{mod.name}</Typography>
                    <Chip
                      label={`${modServices.length} servis`}
                      size="small" variant="outlined"
                      sx={{ mr: 1, height: 20, fontSize: '0.7rem' }}
                    />
                    <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'flex', gap: 0.5 }}>
                      <Button size="small" startIcon={<AddIcon />}
                        onClick={() => setServiceDialog({ defaultModuleId: mod.id })}>
                        Servis
                      </Button>
                      <RowMenu
                        onEdit={() => setModuleDialog({ groupId: mod.moduleGroupId ?? group.id, initial: mod })}
                        onDelete={() => setDeleteTarget({ type: 'module', item: mod })}
                      />
                    </Box>
                  </Box>

                  <Collapse in={isExpanded}>
                    <Box sx={{ bgcolor: 'background.paper' }}>
                      {modServices.length === 0 && (
                        <Typography variant="caption" color="text.disabled" sx={{ px: 4, py: 1, display: 'block' }}>
                          Bu modüle henüz servis eklenmemiş.
                        </Typography>
                      )}
                      {modServices.map((s) => (
                        <ServiceRow
                          key={s.id} service={s}
                          onEdit={(svc) => setServiceDialog({ defaultModuleId: svc.moduleId, initial: svc })}
                          onDelete={(svc) => setDeleteTarget({ type: 'service', item: svc })}
                        />
                      ))}
                    </Box>
                  </Collapse>
                </Box>
              );
            })}
          </AccordionDetails>
        </Accordion>
      ))}

      <Button
        startIcon={<AddIcon />} variant="outlined" size="small" sx={{ mt: 1 }}
        onClick={() => setGroupDialog({ open: true })}
      >
        Yeni Modül Grubu
      </Button>

      {unassigned.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">Modüle Atanmamış Servisler</Typography>
            <Chip label={unassigned.length} size="small" />
            <Button size="small" startIcon={<AddIcon />}
              onClick={() => setServiceDialog({ defaultModuleId: null })}>
              Servis Ekle
            </Button>
          </Box>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            {unassigned.map((s) => (
              <ServiceRow
                key={s.id} service={s}
                onEdit={(svc) => setServiceDialog({ defaultModuleId: null, initial: svc })}
                onDelete={(svc) => setDeleteTarget({ type: 'service', item: svc })}
              />
            ))}
          </Box>
        </Box>
      )}

      <ModuleGroupDialog
        open={groupDialog.open}
        onClose={() => setGroupDialog({ open: false })}
        productId={productId}
        initial={groupDialog.initial}
      />
      {moduleDialog && (
        <ModuleDialog
          open
          onClose={() => setModuleDialog(null)}
          productId={productId}
          groupId={moduleDialog.groupId}
          initial={moduleDialog.initial}
        />
      )}
      {serviceDialog !== null && (
        <ServiceDialog
          open
          onClose={() => setServiceDialog(null)}
          productId={productId}
          defaultModuleId={serviceDialog.defaultModuleId}
          initial={serviceDialog.initial}
          modules={allModules}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        message={`"${deleteTarget?.item.name ?? ''}" silinecek. Bu işlem geri alınamaz.`}
        loading={deleteGroupMut.isPending || deleteModuleMut.isPending || deleteServiceMut.isPending}
      />
    </>
  );
}
