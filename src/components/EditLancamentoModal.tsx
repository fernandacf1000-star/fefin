import React, { useEffect, useState } from 'react';
import { X, CalendarIcon, Users } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';

import {
  useUpdateLancamento,
  useAddMultipleLancamentos,
  type Lancamento,
} from '@/hooks/useLancamentos';
import type { Cartao } from '@/hooks/useCartoes';
import { SUBCATEGORIA_GROUPS, detectCategoriaMacro } from '@/lib/subcategorias';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

function getMesReferenciaFatura(dataCompra: Date, cartaoSelecionado: Cartao | null): string {
  if (!cartaoSelecionado) {
    return dataCompra.getFullYear() + '-' + String(dataCompra.getMonth() + 1).padStart(2, '0');
  }
  const diaCompra = dataCompra.getDate();
  const diaFecha = cartaoSelecionado.dia_fechamento;
  const diaVence = cartaoSelecionado.dia_vencimento ?? diaFecha + 5;
  const mesFechamento = diaCompra <= diaFecha ? dataCompra : addMonths(dataCompra, 1);
  const mesVencimento = diaVence > diaFecha ? mesFechamento : addMonths(mesFechamento, 1);
  return mesVencimento.getFullYear() + '-' + String(mesVencimento.getMonth() + 1).padStart(2, '0');
}

const RECEITA_CATS_EDIT = ['Salario', 'Reembolso Pais', 'Resgate'] as const;
type ReceitaCatEdit = (typeof RECEITA_CATS_EDIT)[number];
const receitaCatMapEdit: Record<ReceitaCatEdit, string> = {
  'Salario': 'salario', 'Reembolso Pais': 'reembolso_pais', 'Resgate': 'resgate_investimento',
};
const receitaCatReverseMap: Record<string, ReceitaCatEdit> = Object.fromEntries(
  Object.entries(receitaCatMapEdit).map(([k, v]) => [v, k as ReceitaCatEdit]),
);

interface Props {
  open: boolean;
  lancamento: Lancamento | null;
  onClose: () => void;
  onSave: (updates: Partial<Lancamento>) => Promise<void>;
  cartoes: Cartao[];
}

type EditScope = 'este' | 'futuras' | 'todos';

function genUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

function dateToStr(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

const EditLancamentoModal = ({ open, lancamento, onClose, onSave, cartoes }: Props) => {
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState<Date>(new Date());
  const [subcategoria, setSubcategoria] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [formaPagamento, setFormaPagamento] = useState<'dinheiro' | 'credito'>('dinheiro');
  const [cartaoId, setCartaoId] = useState('');
  const [saving, setSaving] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [isParcelado, setIsParcelado] = useState(false);
  const [parcelas, setParcelas] = useState('2');
  const [recorrente, setRecorrente] = useState(false);
  const [diaRecorrencia, setDiaRecorrencia] = useState('1');
  const [editScope, setEditScope] = useState<EditScope>('este');
  const [isPais, setIsPais] = useState(false);
  const [isVicente, setIsVicente] = useState(false);
  const [isLuisa, setIsLuisa] = useState(false);
  const [isAdriano, setIsAdriano] = useState(false);
  const [pagoPor, setPagoPor] = useState<'voce' | 'adriano'>('voce');
  const [receitaCat, setReceitaCat] = useState<ReceitaCatEdit>('Salario');

  const updateLancamento = useUpdateLancamento();
  const addMultiple = useAddMultipleLancamentos();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!lancamento) return;
    setDescricao(lancamento.descricao || '');
    // Se é espelho Adriano (adriano: true), o valor armazenado é metade — exibimos o dobro (valor total real)
    const displayValor = (lancamento.adriano ? Number(lancamento.valor) * 2 : Number(lancamento.valor));
    setValor(displayValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    setData(lancamento.data ? new Date(lancamento.data + 'T12:00:00') : new Date());
    setSubcategoria(lancamento.subcategoria || null);
    const sub = lancamento.subcategoria || null;
    if (sub) {
      const grp = SUBCATEGORIA_GROUPS.find(g => g.items.some(i => i.name === sub));
      setSelectedGroup(grp ? grp.group : null);
    } else {
      setSelectedGroup(null);
    }
    setIsParcelado(lancamento.is_parcelado || false);
    setParcelas(String(lancamento.parcela_total || 2));
    setRecorrente(lancamento.recorrente || false);
    setDiaRecorrencia(String(lancamento.dia_recorrencia || 1));
    setEditScope('este');
    const subP = lancamento.subcategoria_pais;
    const isAdrianoMirror = lancamento.adriano || false;
    const subPNorm = (subP || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    setIsVicente(subPNorm === 'vicente');
    setIsLuisa(subPNorm === 'luisa');
    // isPais = tem subcategoria_pais válida E não é espelho Adriano E subcategoria_pais não é 'Adriano'
    setIsPais(!isAdrianoMirror && !!subP && subP !== '' && subPNorm !== 'adriano');
    setIsAdriano(isAdrianoMirror);
    setPagoPor(((lancamento as any).pago_por as 'voce' | 'adriano') || 'voce');
    if (lancamento.cartao_id) {
      setFormaPagamento('credito');
      setCartaoId(lancamento.cartao_id);
    } else {
      setFormaPagamento('dinheiro');
      setCartaoId('');
    }
    setReceitaCat(receitaCatReverseMap[lancamento.categoria] || 'Salario');
  }, [lancamento]);

  // Block split for dependents
  const canSplit = !isPais;
  useEffect(() => {
    if (isPais) { setIsAdriano(false); setPagoPor('voce'); }
  }, [isPais]);

  const handleValorChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) { setValor(''); return; }
    setValor((parseInt(digits, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const getNumValor = () => {
    return parseFloat(valor.replace(/\./g, '').replace(',', '.')) || 0;
  };

  const getSubPais = () => {
    if (!isPais) return null;
    if (isVicente) return 'Vicente';
    if (isLuisa) return 'Luísa';
    return 'Pais';
  };

  const refetchAll = () => {
    queryClient.refetchQueries({ queryKey: ['lancamentos'], exact: false });
  };

  /**
   * Build the set of editable (non-date) fields.
   * Dates are NEVER included here — they are immutable for batch edits.
   */
  const buildFieldUpdates = (opts: {
    isReceitaEdit: boolean;
    numValor: number;
    macro: string | null;
    forma: string;
    cartao: string | null;
  }) => {
    const updates: Record<string, any> = {
      descricao,
      valor: opts.numValor,
      subcategoria: subcategoria || null,
      categoria_macro: opts.macro,
      forma_pagamento: opts.isReceitaEdit ? null : opts.forma,
      cartao_id: opts.isReceitaEdit ? null : opts.cartao,
      subcategoria_pais: opts.isReceitaEdit ? null : getSubPais(),
      // adriano é gerenciado explicitamente nos caminhos de adrianoChanged;
      // nos demais caminhos (sem mudança de flag), preservamos o estado atual
      adriano: isAdriano,
      pago_por: pagoPor,
    };
    if (opts.isReceitaEdit) {
      updates.categoria = receitaCatMapEdit[receitaCat];
    }
    return updates;
  };

  /**
   * Fetch series items based on scope.
   * Returns sorted by data ASC.
   */
  const fetchSeriesItems = async (
    groupKey: 'parcelamento_id' | 'recorrencia_pai_id',
    groupValue: string,
    scope: EditScope,
    currentData: string
  ): Promise<Lancamento[]> => {
    let q = supabase.from('lancamentos').select('*').eq(groupKey, groupValue);
    if (scope === 'futuras') q = q.gte('data', currentData);
    else if (scope === 'este') q = q.eq('id', lancamento!.id);
    const { data: rows } = await q;
    return ((rows || []) as unknown as Lancamento[]).sort((a, b) => a.data.localeCompare(b.data));
  };

  /**
   * Update a batch of items with field-only updates (NO date changes).
   * Each item keeps its original data and mes_referencia.
   */
  const batchUpdateFields = async (items: Lancamento[], fieldUpdates: Record<string, any>) => {
    for (const item of items) {
      await supabase.from('lancamentos').update(fieldUpdates as any).eq('id', item.id);
    }
  };

  /**
   * Update mirrors for a set of origin items (field-only, no date changes).
   */
  const batchUpdateMirrors = async (originIds: string[], fieldUpdates: Record<string, any>) => {
    // Only update mirror-safe fields (not date, not adriano flag)
    const mirrorFields: Record<string, any> = {
      descricao: fieldUpdates.descricao,
      valor: fieldUpdates.valor,
      subcategoria: fieldUpdates.subcategoria,
      categoria_macro: fieldUpdates.categoria_macro,
      forma_pagamento: fieldUpdates.forma_pagamento,
      cartao_id: fieldUpdates.cartao_id,
      pago_por: fieldUpdates.pago_por,
    };
    for (const originId of originIds) {
      await supabase.from('lancamentos').update(mirrorFields as any).eq('lancamento_origem_id', originId);
    }
  };

  /**
   * Create Adriano mirror row object for insertion.
   */
  const buildMirrorRow = (
    origin: Lancamento,
    numValor: number,
    macro: string | null,
    forma: string,
    cartao: string | null,
    seriesOverrides?: {
      is_parcelado?: boolean;
      parcela_atual?: number | null;
      parcela_total?: number | null;
      parcelamento_id?: string | null;
      recorrente?: boolean;
      dia_recorrencia?: number | null;
      recorrencia_pai_id?: string | null;
    }
  ) => ({
    descricao,
    valor: numValor / 2,
    tipo: 'despesa' as const,
    categoria: origin.categoria || 'despesa',
    subcategoria: subcategoria || null,
    categoria_macro: macro,
    forma_pagamento: forma,
    cartao_id: cartao,
    adriano: true,
    pago_por: pagoPor,
    subcategoria_pais: 'Adriano',
    // Mirror keeps the SAME date as its origin
    data: origin.data,
    mes_referencia: origin.mes_referencia,
    is_parcelado: seriesOverrides?.is_parcelado ?? false,
    parcela_atual: seriesOverrides?.parcela_atual ?? null,
    parcela_total: seriesOverrides?.parcela_total ?? null,
    parcelamento_id: seriesOverrides?.parcelamento_id ?? null,
    pago: false,
    recorrente: seriesOverrides?.recorrente ?? false,
    dia_recorrencia: seriesOverrides?.dia_recorrencia ?? null,
    recorrencia_ate: null,
    recorrencia_pai_id: seriesOverrides?.recorrencia_pai_id ?? null,
    lancamento_origem_id: origin.id,
  });

  const handleSave = async () => {
    if (!lancamento || saving) return;
    const numValor = getNumValor();
    if (numValor <= 0) return;
    setSaving(true);
    try {
      const macro = detectCategoriaMacro(subcategoria || '') || null;
      const forma = formaPagamento === 'dinheiro' ? 'dinheiro' : 'credito';
      const cartao = formaPagamento === 'credito' ? cartaoId || null : null;
      const novaData = format(data, 'yyyy-MM-dd');
      const novoMesRef = data.getFullYear() + '-' + String(data.getMonth() + 1).padStart(2, '0');
      const isReceitaEdit = lancamento.tipo === 'receita';
      const cartaoObj = cartao ? cartoes.find(c => c.id === cartao) || null : null;
      const mesRefFatura = !isReceitaEdit && forma === 'credito'
        ? getMesReferenciaFatura(data, cartaoObj)
        : novoMesRef;

      const wasAdriano = lancamento.adriano || false;
      const nowAdriano = !isReceitaEdit && isAdriano;
      const adrianoChanged = wasAdriano !== nowAdriano;

      // Se a despesa JÁ era (e continua sendo) dividida com Adriano,
      // numValor é o valor total (dobrado na exibição). O banco guarda metade.
      const valorParaBanco = (!adrianoChanged && nowAdriano) ? numValor / 2 : numValor;

      const fieldUpdates = buildFieldUpdates({ isReceitaEdit, numValor: valorParaBanco, macro, forma, cartao });

      const wasParcelado = lancamento.is_parcelado;
      const wasRecorrente = lancamento.recorrente;
      const wasSimples = !wasParcelado && !wasRecorrente;

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // ADRIANO ON: activate split for affected items
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      if (adrianoChanged && nowAdriano) {
        const halfValor = numValor / 2;
        const halfFieldUpdates = { ...fieldUpdates, valor: halfValor };

        if (wasParcelado && lancamento.parcelamento_id) {
          const items = await fetchSeriesItems('parcelamento_id', lancamento.parcelamento_id, editScope, lancamento.data);
          const mirrorParcelamentoId = genUUID();

          // Update originals (only "este" gets new date)
          for (const item of items) {
            const upd: Record<string, any> = { ...halfFieldUpdates };
            if (item.id === lancamento.id) {
              upd.data = novaData;
              upd.mes_referencia = mesRefFatura;
            }
            await supabase.from('lancamentos').update(upd as any).eq('id', item.id);
          }

          // Create mirrors (each keeps its origin's date)
          const mirrors = items.map(item => {
            const originForMirror = item.id === lancamento.id
              ? { ...item, data: novaData, mes_referencia: mesRefFatura }
              : item;
            return buildMirrorRow(originForMirror, numValor, macro, forma, cartao, {
              is_parcelado: true,
              parcela_atual: item.parcela_atual,
              parcela_total: item.parcela_total,
              parcelamento_id: mirrorParcelamentoId,
            });
          });
          if (mirrors.length > 0) await addMultiple.mutateAsync(mirrors as any);

        } else if (wasRecorrente && lancamento.recorrencia_pai_id) {
          const items = await fetchSeriesItems('recorrencia_pai_id', lancamento.recorrencia_pai_id, editScope, lancamento.data);
          const mirrorPaiId = genUUID();

          for (const item of items) {
            const upd: Record<string, any> = { ...halfFieldUpdates };
            if (item.id === lancamento.id) {
              upd.data = novaData;
              upd.mes_referencia = mesRefFatura;
            }
            await supabase.from('lancamentos').update(upd as any).eq('id', item.id);
          }

          const mirrors = items.map(item => {
            const originForMirror = item.id === lancamento.id
              ? { ...item, data: novaData, mes_referencia: mesRefFatura }
              : item;
            return buildMirrorRow(originForMirror, numValor, macro, forma, cartao, {
              recorrente: true,
              dia_recorrencia: item.dia_recorrencia,
              recorrencia_pai_id: mirrorPaiId,
            });
          });
          if (mirrors.length > 0) await addMultiple.mutateAsync(mirrors as any);

        } else {
          // Simple item → split
          await updateLancamento.mutateAsync({
            id: lancamento.id,
            ...fieldUpdates,
            valor: halfValor,
            data: novaData,
            mes_referencia: mesRefFatura,
            adriano: false,
          } as any);
          const originForMirror = { ...lancamento, data: novaData, mes_referencia: mesRefFatura };
          await addMultiple.mutateAsync([buildMirrorRow(originForMirror, numValor, macro, forma, cartao)] as any);
        }

        refetchAll();

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // ADRIANO OFF: remove split, restore full value
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      } else if (adrianoChanged && !nowAdriano) {
        // numValor já é o valor total (foi exibido dobrado ao usuário); basta usar direto
        const fullFieldUpdates = { ...fieldUpdates, valor: numValor, adriano: false };

        if (wasParcelado && lancamento.parcelamento_id) {
          const items = await fetchSeriesItems('parcelamento_id', lancamento.parcelamento_id, editScope, lancamento.data);
          for (const item of items) {
            const upd: Record<string, any> = { ...fullFieldUpdates };
            if (item.id === lancamento.id) {
              upd.data = novaData;
              upd.mes_referencia = mesRefFatura;
            }
            await supabase.from('lancamentos').update(upd as any).eq('id', item.id);
            // Delete mirror linked to this origin
            await supabase.from('lancamentos').delete().eq('lancamento_origem_id', item.id);
          }
        } else if (wasRecorrente && lancamento.recorrencia_pai_id) {
          const items = await fetchSeriesItems('recorrencia_pai_id', lancamento.recorrencia_pai_id, editScope, lancamento.data);
          for (const item of items) {
            const upd: Record<string, any> = { ...fullFieldUpdates };
            if (item.id === lancamento.id) {
              upd.data = novaData;
              upd.mes_referencia = mesRefFatura;
            }
            await supabase.from('lancamentos').update(upd as any).eq('id', item.id);
            await supabase.from('lancamentos').delete().eq('lancamento_origem_id', item.id);
          }
        } else {
          // Simple item
          await updateLancamento.mutateAsync({
            id: lancamento.id,
            ...fullFieldUpdates,
            data: novaData,
            mes_referencia: mesRefFatura,
          } as any);
          await supabase.from('lancamentos').delete().eq('lancamento_origem_id', lancamento.id);
        }

        refetchAll();

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // CONVERT simple → parcelado (creation, not edit)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      } else if (wasSimples && isParcelado && !recorrente) {
        const nParcelas = parseInt(parcelas, 10) || 2;
        const parcelamentoId = genUUID();
        await updateLancamento.mutateAsync({
          id: lancamento.id,
          ...fieldUpdates,
          data: novaData,
          mes_referencia: mesRefFatura,
          is_parcelado: true,
          parcela_atual: 1,
          parcela_total: nParcelas,
          parcelamento_id: parcelamentoId,
        } as any);
        const newRows: any[] = [];
        for (let i = 1; i < nParcelas; i++) {
          const dp = addMonths(data, i);
          const daysInMonth = new Date(dp.getFullYear(), dp.getMonth() + 1, 0).getDate();
          const actualDay = Math.min(data.getDate(), daysInMonth);
          const dpDate = new Date(dp.getFullYear(), dp.getMonth(), actualDay);
          const dpStr = dateToStr(dpDate);
          newRows.push({
            descricao,
            valor: numValor,
            tipo: 'despesa',
            categoria: lancamento.categoria || 'despesa',
            subcategoria: subcategoria || null,
            categoria_macro: macro,
            forma_pagamento: forma,
            cartao_id: cartao,
            subcategoria_pais: getSubPais(),
            data: dpStr,
            mes_referencia: getMesReferenciaFatura(dpDate, cartaoObj),
            parcela_atual: i + 1,
            parcela_total: nParcelas,
            is_parcelado: true,
            parcelamento_id: parcelamentoId,
            pago: false,
            recorrente: false,
            dia_recorrencia: null,
            recorrencia_ate: null,
            recorrencia_pai_id: null,
            adriano: false,
          });
        }
        if (newRows.length > 0) await addMultiple.mutateAsync(newRows);

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // CONVERT simple → recorrente (creation, not edit)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      } else if (wasSimples && recorrente && !isParcelado) {
        const diaR = parseInt(diaRecorrencia, 10) || 1;
        const paiId = genUUID();
        await updateLancamento.mutateAsync({
          id: lancamento.id,
          ...fieldUpdates,
          data: novaData,
          mes_referencia: mesRefFatura,
          recorrente: true,
          dia_recorrencia: diaR,
          recorrencia_pai_id: paiId,
          is_parcelado: false,
          parcela_atual: null,
          parcela_total: null,
          parcelamento_id: null,
        } as any);
        const newRows: any[] = [];
        for (let i = 1; i < 24; i++) {
          const mr = addMonths(data, i);
          const daysInMonth = new Date(mr.getFullYear(), mr.getMonth() + 1, 0).getDate();
          const recDate = new Date(mr.getFullYear(), mr.getMonth(), Math.min(diaR, daysInMonth));
          const drStr = dateToStr(recDate);
          newRows.push({
            descricao,
            valor: numValor,
            tipo: 'despesa',
            categoria: lancamento.categoria || 'despesa',
            subcategoria: subcategoria || null,
            categoria_macro: macro,
            forma_pagamento: forma,
            cartao_id: cartao,
            subcategoria_pais: getSubPais(),
            data: drStr,
            mes_referencia: getMesReferenciaFatura(recDate, cartaoObj),
            parcela_atual: null,
            parcela_total: null,
            is_parcelado: false,
            parcelamento_id: null,
            pago: false,
            recorrente: true,
            dia_recorrencia: diaR,
            recorrencia_ate: null,
            recorrencia_pai_id: paiId,
            adriano: false,
          });
        }
        await addMultiple.mutateAsync(newRows);

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // EDIT existing parcelado series (NO date recalculation)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      } else if (wasParcelado) {
        if (editScope === 'este') {
          // Only "este" allows date change
          await updateLancamento.mutateAsync({
            id: lancamento.id, ...fieldUpdates, data: novaData, mes_referencia: mesRefFatura,
          } as any);
          // Update linked mirror too
          await supabase.from('lancamentos').update({
            descricao: fieldUpdates.descricao,
            valor: fieldUpdates.valor,
            subcategoria: fieldUpdates.subcategoria,
            categoria_macro: fieldUpdates.categoria_macro,
            forma_pagamento: fieldUpdates.forma_pagamento,
            cartao_id: fieldUpdates.cartao_id,
          } as any).eq('lancamento_origem_id', lancamento.id);
        } else {
          // "futuras" or "todos": update fields only, dates stay as-is
          const items = await fetchSeriesItems('parcelamento_id', lancamento.parcelamento_id!, editScope, lancamento.data);
          await batchUpdateFields(items, fieldUpdates);
          await batchUpdateMirrors(items.map(i => i.id), fieldUpdates);
        }
        refetchAll();

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // EDIT existing recorrente series (NO date recalculation)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      } else if (wasRecorrente) {
        if (editScope === 'este') {
          await updateLancamento.mutateAsync({
            id: lancamento.id, ...fieldUpdates, data: novaData, mes_referencia: mesRefFatura,
          } as any);
          await supabase.from('lancamentos').update({
            descricao: fieldUpdates.descricao,
            valor: fieldUpdates.valor,
            subcategoria: fieldUpdates.subcategoria,
            categoria_macro: fieldUpdates.categoria_macro,
            forma_pagamento: fieldUpdates.forma_pagamento,
            cartao_id: fieldUpdates.cartao_id,
          } as any).eq('lancamento_origem_id', lancamento.id);
        } else {
          const items = await fetchSeriesItems('recorrencia_pai_id', lancamento.recorrencia_pai_id!, editScope, lancamento.data);
          await batchUpdateFields(items, fieldUpdates);
          await batchUpdateMirrors(items.map(i => i.id), fieldUpdates);
        }
        refetchAll();

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // SIMPLE edit (single item, not series)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      } else {
        await onSave({ ...fieldUpdates, data: novaData, mes_referencia: mesRefFatura });
      }

      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open || !lancamento) return null;
  const isReceita = lancamento.tipo === 'receita';
  const wasParcelado = lancamento.is_parcelado;
  const wasRecorrente = lancamento.recorrente;
  const wasSimples = !wasParcelado && !wasRecorrente;

  return (
    <>
      <div className='fixed inset-0 z-[80] bg-black/25 backdrop-blur-sm' onClick={onClose} />
      <div className='fixed inset-x-4 top-1/2 -translate-y-1/2 z-[90] max-h-[88vh] overflow-y-auto rounded-3xl bg-white shadow-xl border border-border'>
        <div className='px-5 pt-5 pb-8 space-y-4'>
          <div className='flex items-center justify-between'>
            <h2 className='text-base font-bold text-foreground'>Editar lançamento</h2>
            <button onClick={onClose} className='p-1.5 rounded-full hover:bg-secondary'>
              <X size={17} className='text-muted-foreground' />
            </button>
          </div>

          <div className='space-y-1.5'>
            <label className='text-xs font-medium text-muted-foreground'>Descrição</label>
            <Input value={descricao} onChange={e => setDescricao(e.target.value)} className='bg-[#E8ECF5] border-0 rounded-xl' />
          </div>

          <div className='space-y-1.5'>
            <label className='text-xs font-medium text-muted-foreground'>Valor</label>
            <div className='relative'>
              <span className='absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground'>R$</span>
              <Input value={valor} onChange={e => handleValorChange(e.target.value)}
                className='bg-[#E8ECF5] border-0 pl-9 text-base font-bold rounded-xl' inputMode='numeric' />
            </div>
          </div>

          <div className='space-y-1.5'>
            <label className='text-xs font-medium text-muted-foreground'>Data</label>
            <Button variant='outline' className='w-full justify-start bg-[#E8ECF5] border-0 text-foreground text-sm rounded-xl'
              onClick={() => setCalendarOpen(v => !v)}>
              <CalendarIcon className='mr-2 h-4 w-4 text-muted-foreground' />
              {format(data, "dd 'de' MMMM, yyyy", { locale: ptBR })}
            </Button>
            {calendarOpen && (
              <div className='rounded-xl overflow-hidden border border-border bg-white shadow-md'>
                <Calendar mode='single' selected={data}
                  onSelect={d => { if (d) { setData(d); setCalendarOpen(false); } }}
                  initialFocus className='p-3 pointer-events-auto' />
              </div>
            )}
            {/* Show hint when editing series with non-este scope */}
            {(wasParcelado || wasRecorrente) && editScope !== 'este' && (
              <p className='text-[10px] text-amber-600 px-1'>
                ⚠ A data só é alterada para "Só este lançamento". Em lote, as datas originais são preservadas.
              </p>
            )}
          </div>

          {isReceita && (
            <div className='space-y-2'>
              <label className='text-xs font-medium text-muted-foreground'>Categoria</label>
              <div className='flex flex-wrap gap-1.5'>
                {RECEITA_CATS_EDIT.map(cat => (
                  <button key={cat} onClick={() => setReceitaCat(cat)}
                    className={cn('px-3 py-1.5 rounded-xl text-xs font-medium transition-colors',
                      receitaCat === cat ? 'gradient-emerald text-primary-foreground' : 'bg-[#E8ECF5] text-muted-foreground')}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isReceita && (
            <div className='space-y-2'>
              <label className='text-xs font-medium text-muted-foreground'>Categoria</label>
              <div className='grid grid-cols-4 gap-1.5'>
                {SUBCATEGORIA_GROUPS.map(group => {
                  const isActive = selectedGroup === group.group;
                  const hasSelection = group.items.some(i => i.name === subcategoria);
                  return (
                    <button key={group.group}
                      onClick={() => setSelectedGroup(isActive ? null : group.group)}
                      className={cn('flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all',
                        isActive ? 'bg-primary/10 ring-2 ring-primary'
                          : hasSelection ? 'bg-primary/5 ring-1 ring-primary/30' : 'bg-[#E8ECF5]')}>
                      <span className='text-lg'>{group.emoji}</span>
                      <span className={cn('text-[9px] font-medium',
                        isActive ? 'text-primary' : hasSelection ? 'text-primary/70' : 'text-muted-foreground')}>
                        {group.group}
                      </span>
                    </button>
                  );
                })}
              </div>
              {selectedGroup && (() => {
                const group = SUBCATEGORIA_GROUPS.find(g => g.group === selectedGroup);
                if (!group) return null;
                return (
                  <div className='rounded-xl p-2.5 space-y-1.5' style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}>
                    <p className='text-[9px] font-semibold text-primary uppercase tracking-wider'>{group.group}</p>
                    <div className='flex flex-wrap gap-1.5'>
                      {group.items.map(item => (
                        <button key={item.name}
                          onClick={() => setSubcategoria(subcategoria === item.name ? null : item.name)}
                          className={cn('px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors',
                            subcategoria === item.name ? 'bg-primary text-primary-foreground' : 'bg-white border border-border text-muted-foreground')}>
                          {item.name}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {!isReceita && (
            <div className='space-y-2'>
              <label className='text-xs font-medium text-muted-foreground'>Pagamento</label>
              <div className='flex gap-1 p-1 rounded-xl bg-[#E8ECF5]'>
                {(['dinheiro', 'credito'] as const).map(f => (
                  <button key={f} onClick={() => setFormaPagamento(f)}
                    className={cn('flex-1 py-2 rounded-lg text-xs font-semibold transition-all',
                      formaPagamento === f ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground')}>
                    {f === 'dinheiro' ? 'Dinheiro' : 'Crédito'}
                  </button>
                ))}
              </div>
              {formaPagamento === 'credito' && cartoes.length > 0 && (
                <div className='flex gap-2 flex-wrap'>
                  {cartoes.map(c => (
                    <button key={c.id} onClick={() => setCartaoId(c.id)}
                      className={cn('px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors',
                        cartaoId === c.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-white border-border text-muted-foreground')}>
                      {c.nome}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!isReceita && (
            <>
              <button
                onClick={() => {
                  setIsPais(v => {
                    if (v) { setIsVicente(false); setIsLuisa(false); }
                    return !v;
                  });
                }}
                className={cn('w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border-2 transition-all',
                  isPais ? 'border-amber-400 bg-amber-50' : 'border-[#E8ECF5] bg-[#E8ECF5]')}>
                <div className='flex items-center gap-2'>
                  <Users size={15} className={isPais ? 'text-amber-600' : 'text-muted-foreground'} />
                  <span className={cn('text-sm font-medium', isPais ? 'text-amber-700' : 'text-muted-foreground')}>
                    Despesa dos pais
                  </span>
                </div>
                <div className={cn('w-9 h-5 rounded-full flex items-center px-0.5 transition-all',
                  isPais ? 'bg-amber-400 justify-end' : 'bg-muted justify-start')}>
                  <div className='w-4 h-4 rounded-full bg-white shadow-sm' />
                </div>
              </button>

              {/* Vicente (sub-option under Pais) */}
              {isPais && (
                <button
                  onClick={() => { setIsVicente(v => { if (!v) setIsLuisa(false); return !v; }); }}
                  className={cn('w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border-2 transition-all',
                    isVicente ? 'border-green-400 bg-green-50' : 'border-[#E8ECF5] bg-[#E8ECF5]')}>
                  <div className='flex items-center gap-2'>
                    <span className='text-base'>👦</span>
                    <span className={cn('text-sm font-medium', isVicente ? 'text-green-700' : 'text-muted-foreground')}>
                      Despesa do Vicente
                    </span>
                  </div>
                  <div className={cn('w-9 h-5 rounded-full flex items-center px-0.5 transition-all',
                    isVicente ? 'bg-green-400 justify-end' : 'bg-muted justify-start')}>
                    <div className='w-4 h-4 rounded-full bg-white shadow-sm' />
                  </div>
                </button>
              )}

              {/* Luísa (sub-option under Pais) */}
              {isPais && (
                <button
                  onClick={() => { setIsLuisa(v => { if (!v) setIsVicente(false); return !v; }); }}
                  className={cn('w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border-2 transition-all',
                    isLuisa ? 'border-pink-400 bg-pink-50' : 'border-[#E8ECF5] bg-[#E8ECF5]')}>
                  <div className='flex items-center gap-2'>
                    <span className='text-base'>{'\u{1F469}\u200D\u{1F9B3}'}</span>
                    <span className={cn('text-sm font-medium', isLuisa ? 'text-pink-700' : 'text-muted-foreground')}>
                      Despesa da Luísa
                    </span>
                  </div>
                  <div className={cn('w-9 h-5 rounded-full flex items-center px-0.5 transition-all',
                    isLuisa ? 'bg-pink-400 justify-end' : 'bg-muted justify-start')}>
                    <div className='w-4 h-4 rounded-full bg-white shadow-sm' />
                  </div>
                </button>
              )}

              {/* Dividir com Adriano (only when NOT Pais) */}
              <button
                onClick={() => { if (canSplit) setIsAdriano(v => !v); }}
                disabled={!canSplit}
                className={cn('w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border-2 transition-all',
                  !canSplit ? 'opacity-40 cursor-not-allowed border-[#E8ECF5] bg-[#E8ECF5]' :
                  isAdriano ? 'border-blue-400 bg-blue-50' : 'border-[#E8ECF5] bg-[#E8ECF5]')}>
                <div className='flex items-center gap-2'>
                  <span className='text-base'>👨</span>
                  <span className={cn('text-sm font-medium', isAdriano ? 'text-blue-700' : 'text-muted-foreground')}>
                    Dividir com Adriano
                  </span>
                </div>
                <div className={cn('w-9 h-5 rounded-full flex items-center px-0.5 transition-all',
                  isAdriano ? 'bg-blue-400 justify-end' : 'bg-muted justify-start')}>
                  <div className='w-4 h-4 rounded-full bg-white shadow-sm' />
                </div>
              </button>
              {!canSplit && (
                <p className='text-[10px] text-amber-600 px-4 -mt-2'>
                  Despesas de Pais/Vicente/Luísa não podem ser divididas.
                </p>
              )}
              {isAdriano && (
                <div className='space-y-1.5 px-1 -mt-1'>
                  <p className='text-xs font-medium text-muted-foreground'>Quem pagou?</p>
                  <div className='flex gap-1 p-1 rounded-xl bg-[#E8ECF5]'>
                    {([{ key: 'voce', label: '🙋‍♀️ Eu' }, { key: 'adriano', label: '👨 Adriano' }] as const).map(opt => (
                      <button key={opt.key} onClick={() => setPagoPor(opt.key as 'voce' | 'adriano')}
                        className={cn('flex-1 py-2 rounded-lg text-xs font-semibold transition-all',
                          pagoPor === opt.key ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground')}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {!isReceita && wasSimples && (
            <div className='space-y-2'>
              <label className='text-xs font-medium text-muted-foreground'>Converter em</label>
              <div className='flex gap-2'>
                <button
                  onClick={() => { setIsParcelado(v => !v); if (!isParcelado) setRecorrente(false); }}
                  className={cn('flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium border transition-all',
                    isParcelado ? 'border-primary/40 bg-primary/5 text-primary' : 'border-[#E8ECF5] bg-[#E8ECF5] text-muted-foreground')}>
                  <span>Parcelado</span>
                  {isParcelado && (
                    <input type='number' min={2} max={48} value={parcelas}
                      onChange={e => setParcelas(e.target.value)} onClick={e => e.stopPropagation()}
                      className='w-10 text-center bg-white rounded-lg border border-border text-xs font-bold text-foreground' inputMode='numeric' />
                  )}
                </button>
                <button
                  onClick={() => { setRecorrente(v => !v); if (!recorrente) setIsParcelado(false); }}
                  className={cn('flex-1 flex items-center justify-center px-3 py-2.5 rounded-xl text-sm font-medium border transition-all',
                    recorrente ? 'border-primary/40 bg-primary/5 text-primary' : 'border-[#E8ECF5] bg-[#E8ECF5] text-muted-foreground')}>
                  Recorrente
                </button>
              </div>
              {recorrente && (
                <div className='flex items-center gap-2 px-1'>
                  <span className='text-xs text-muted-foreground'>Repetir no dia</span>
                  <Input type='number' min={1} max={31} value={diaRecorrencia}
                    onChange={e => setDiaRecorrencia(e.target.value)}
                    className='bg-[#E8ECF5] border-0 w-16 text-center rounded-xl' inputMode='numeric' />
                  <span className='text-xs text-muted-foreground'>de cada mês</span>
                </div>
              )}
            </div>
          )}

          {!isReceita && (wasParcelado || wasRecorrente) && (
            <div className='space-y-2'>
              <label className='text-xs font-medium text-muted-foreground'>Aplicar alteração em</label>
              <div className='flex flex-col gap-1.5'>
                {[
                  { key: 'este', label: 'Só este lançamento' },
                  { key: 'futuras', label: wasParcelado ? 'Este e próximas parcelas' : 'Este e próximas recorrências' },
                  { key: 'todos', label: wasParcelado ? 'Todas as parcelas' : 'Todas as recorrências' },
                ].map(opt => (
                  <button key={opt.key} onClick={() => setEditScope(opt.key as EditScope)}
                    className={cn('flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all text-left',
                      editScope === opt.key ? 'border-primary/40 bg-primary/5 text-primary' : 'border-[#E8ECF5] bg-[#E8ECF5] text-muted-foreground')}>
                    <div className={cn('w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                      editScope === opt.key ? 'border-primary' : 'border-muted-foreground/40')}>
                      {editScope === opt.key && <div className='w-2 h-2 rounded-full bg-primary' />}
                    </div>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className='flex gap-3 pt-1'>
            <Button variant='outline' onClick={onClose} className='flex-1 bg-secondary border-0 text-muted-foreground rounded-xl'>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className='flex-1 gradient-emerald text-primary-foreground font-semibold rounded-xl'>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditLancamentoModal;
