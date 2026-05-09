import React, { useEffect, useState } from 'react';
import { X, CalendarIcon, Users } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  useUpdateLancamento,
  useAddMultipleLancamentos,
  type Lancamento,
} from '@/hooks/useLancamentos';
import type { Cartao } from '@/hooks/useCartoes';
import { SUBCATEGORIA_GROUPS, detectCategoriaMacro } from '@/lib/subcategorias';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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

const RECEITA_CATS_EDIT = ['Salario', 'Reembolso Pais', 'Reembolso Adriano', 'Reembolso Luísa', 'Resgate'] as const;
type ReceitaCatEdit = (typeof RECEITA_CATS_EDIT)[number];
const receitaCatMapEdit: Record<ReceitaCatEdit, string> = {
  'Salario': 'salario',
  'Reembolso Pais': 'reembolso_pais',
  'Reembolso Adriano': 'reembolso_adriano',
  'Reembolso Luísa': 'reembolso_luisa',
  'Resgate': 'resgate_investimento',
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
    const { data: rows, error } = await q.order('data', { ascending: true });
    if (error) throw error;
    return (rows || []) as Lancamento[];
  };

  const handleSave = async () => {
    if (!lancamento) return;
    setSaving(true);

    try {
      const isReceitaEdit = lancamento.tipo === 'receita';
      const numValor = getNumValor();
      if (!numValor) throw new Error('Valor inválido');

      const wasParcelado = !!(lancamento.is_parcelado || lancamento.parcelamento_id);
      const wasRecorrente = !!(lancamento.recorrente || lancamento.recorrencia_pai_id);
      const wasSimples = !wasParcelado && !wasRecorrente;

      const macro = isReceitaEdit ? null : (subcategoria ? detectCategoriaMacro(subcategoria) : null);
      const forma = formaPagamento === 'credito' ? 'credito' : 'dinheiro';
      const cid = formaPagamento === 'credito' ? cartaoId : null;

      // A) SIMPLE → SIMPLE (single edit)
      if (wasSimples && !isParcelado && !recorrente) {
        const fields = buildFieldUpdates({ isReceitaEdit, numValor, macro, forma, cartao: cid });
        fields.data = dateToStr(data);
        if (!isReceitaEdit) {
          const mrFatura = (forma === 'credito' && cid) ? getMesReferenciaFatura(data, cartoes.find(c => c.id === cid) || null) : null;
          fields.mes_referencia_fatura = mrFatura;
        }
        await updateLancamento.mutateAsync({ id: lancamento.id, ...fields });
        refetchAll();
        toast.success('Lançamento atualizado', { duration: 1500 });
        onClose();
        return;
      }

      // B) SIMPLE → PARCELADO
      if (wasSimples && isParcelado && !recorrente) {
        const nParcelas = Math.max(2, Math.min(48, parseInt(parcelas, 10) || 2));
        const parcID = genUUID();
        const firstCard = cartoes.find(c => c.id === cid) || null;
        const cartas: Lancamento[] = [];
        const val = numValor / nParcelas;
        for (let i = 1; i <= nParcelas; i++) {
          const mesOffset = new Date(data);
          mesOffset.setMonth(data.getMonth() + (i - 1));
          const mrFatura = (forma === 'credito' && firstCard) ? getMesReferenciaFatura(mesOffset, firstCard) : null;
          cartas.push({
            tipo: lancamento.tipo || 'despesa',
            descricao: `${descricao} (${i}/${nParcelas})`,
            valor: val,
            data: dateToStr(mesOffset),
            categoria: isReceitaEdit ? receitaCatMapEdit[receitaCat] : (macro || ''),
            categoria_macro: macro,
            subcategoria: subcategoria || null,
            forma_pagamento: !isReceitaEdit ? forma : null,
            cartao_id: !isReceitaEdit ? cid : null,
            mes_referencia_fatura: !isReceitaEdit ? mrFatura : null,
            is_parcelado: true,
            parcelamento_id: parcID,
            parcela_atual: i,
            parcela_total: nParcelas,
            recorrente: false,
            subcategoria_pais: !isReceitaEdit ? getSubPais() : null,
            adriano: isAdriano,
            pago_por: pagoPor,
          } as Lancamento);
        }
        await supabase.from('lancamentos').delete().eq('id', lancamento.id);
        await addMultiple.mutateAsync(cartas);
        refetchAll();
        toast.success('Convertido em parcelado', { duration: 1500 });
        onClose();
        return;
      }

      // C) SIMPLE → RECORRENTE
      if (wasSimples && recorrente && !isParcelado) {
        const diaRec = Math.max(1, Math.min(31, parseInt(diaRecorrencia, 10) || 1));
        const recPaiID = genUUID();
        const fields = buildFieldUpdates({ isReceitaEdit, numValor, macro, forma, cartao: cid });
        fields.recorrente = true;
        fields.recorrencia_pai_id = recPaiID;
        fields.dia_recorrencia = diaRec;
        fields.data = dateToStr(data);
        if (!isReceitaEdit) {
          const mrFatura = (forma === 'credito' && cid) ? getMesReferenciaFatura(data, cartoes.find(c => c.id === cid) || null) : null;
          fields.mes_referencia_fatura = mrFatura;
        }
        await updateLancamento.mutateAsync({ id: lancamento.id, ...fields });
        refetchAll();
        toast.success('Convertido em recorrente', { duration: 1500 });
        onClose();
        return;
      }

      // D) PARCELADO editing (by scope)
      if (wasParcelado) {
        const groupKey = 'parcelamento_id';
        const groupValue = lancamento.parcelamento_id!;
        const scope = editScope;
        const items = await fetchSeriesItems(groupKey, groupValue, scope, lancamento.data!);

        const adrianoChanged = (isAdriano !== !!lancamento.adriano);
        const fields = buildFieldUpdates({ isReceitaEdit, numValor, macro, forma, cartao: cid });

        if (scope === 'este') {
          fields.data = dateToStr(data);
          if (!isReceitaEdit) {
            const cardToUse = cartoes.find(c => c.id === cid) || null;
            const mrFatura = (forma === 'credito' && cardToUse) ? getMesReferenciaFatura(data, cardToUse) : null;
            fields.mes_referencia_fatura = mrFatura;
          }
          if (adrianoChanged) {
            if (isAdriano && !lancamento.adriano) {
              await supabase.from('lancamentos').delete().eq('id', lancamento.id);
              const metade = numValor / 2;
              const cardToUse = cartoes.find(c => c.id === cid) || null;
              const mrFatura = !isReceitaEdit && forma === 'credito' && cardToUse ? getMesReferenciaFatura(data, cardToUse) : null;
              const novoEspelho: Lancamento = {
                tipo: lancamento.tipo || 'despesa',
                descricao,
                valor: metade,
                data: dateToStr(data),
                categoria: isReceitaEdit ? receitaCatMapEdit[receitaCat] : (macro || ''),
                categoria_macro: macro,
                subcategoria: subcategoria || null,
                forma_pagamento: !isReceitaEdit ? forma : null,
                cartao_id: !isReceitaEdit ? cid : null,
                mes_referencia_fatura: !isReceitaEdit ? mrFatura : null,
                is_parcelado: lancamento.is_parcelado,
                parcelamento_id: lancamento.parcelamento_id,
                parcela_atual: lancamento.parcela_atual,
                parcela_total: lancamento.parcela_total,
                recorrente: lancamento.recorrente || false,
                subcategoria_pais: !isReceitaEdit ? 'Adriano' : null,
                adriano: true,
                pago_por: pagoPor,
                shared_group_id: genUUID(),
              } as Lancamento;
              await addMultiple.mutateAsync([novoEspelho]);
            } else if (!isAdriano && lancamento.adriano) {
              const subP = lancamento.subcategoria_pais || '';
              if (subP.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === 'adriano') {
                await supabase.from('lancamentos').delete().eq('shared_group_id', lancamento.shared_group_id!);
              } else {
                await updateLancamento.mutateAsync({ id: lancamento.id, ...fields });
              }
            }
          } else {
            await updateLancamento.mutateAsync({ id: lancamento.id, ...fields });
          }
        } else {
          // scope = futuras | todos
          if (adrianoChanged) {
            if (isAdriano && !lancamento.adriano) {
              const ids = items.filter(it => it.adriano !== true).map(it => it.id);
              if (ids.length > 0) await supabase.from('lancamentos').delete().in('id', ids);
              const cartas: Lancamento[] = [];
              for (const it of items) {
                if (it.adriano) continue;
                const itDate = new Date(it.data + 'T12:00:00');
                const metade = numValor / 2;
                const cardToUse = cartoes.find(c => c.id === cid) || null;
                const mrFatura = !isReceitaEdit && forma === 'credito' && cardToUse ? getMesReferenciaFatura(itDate, cardToUse) : null;
                const espelho: Lancamento = {
                  tipo: it.tipo || 'despesa',
                  descricao,
                  valor: metade,
                  data: it.data!,
                  categoria: isReceitaEdit ? receitaCatMapEdit[receitaCat] : (macro || ''),
                  categoria_macro: macro,
                  subcategoria: subcategoria || null,
                  forma_pagamento: !isReceitaEdit ? forma : null,
                  cartao_id: !isReceitaEdit ? cid : null,
                  mes_referencia_fatura: !isReceitaEdit ? mrFatura : null,
                  is_parcelado: it.is_parcelado,
                  parcelamento_id: it.parcelamento_id,
                  parcela_atual: it.parcela_atual,
                  parcela_total: it.parcela_total,
                  recorrente: it.recorrente || false,
                  subcategoria_pais: !isReceitaEdit ? 'Adriano' : null,
                  adriano: true,
                  pago_por: pagoPor,
                  shared_group_id: genUUID(),
                } as Lancamento;
                cartas.push(espelho);
              }
              await addMultiple.mutateAsync(cartas);
            } else if (!isAdriano && lancamento.adriano) {
              const subP = lancamento.subcategoria_pais || '';
              const norm = subP.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
              if (norm === 'adriano') {
                const groupIDs = Array.from(new Set(items.map(it => it.shared_group_id).filter(Boolean))) as string[];
                if (groupIDs.length > 0) {
                  for (const gid of groupIDs) {
                    await supabase.from('lancamentos').delete().eq('shared_group_id', gid);
                  }
                }
              } else {
                const ids = items.map(it => it.id);
                if (ids.length > 0) {
                  for (const id of ids) await updateLancamento.mutateAsync({ id, ...fields });
                }
              }
            }
          } else {
            const ids = items.map(it => it.id);
            if (ids.length > 0) {
              for (const id of ids) await updateLancamento.mutateAsync({ id, ...fields });
            }
          }
        }
        refetchAll();
        toast.success('Parcelas atualizadas', { duration: 1500 });
        onClose();
        return;
      }

      // E) RECORRENTE editing (by scope)
      if (wasRecorrente) {
        const groupKey = 'recorrencia_pai_id';
        const groupValue = lancamento.recorrencia_pai_id!;
        const scope = editScope;
        const items = await fetchSeriesItems(groupKey, groupValue, scope, lancamento.data!);

        const adrianoChanged = (isAdriano !== !!lancamento.adriano);
        const fields = buildFieldUpdates({ isReceitaEdit, numValor, macro, forma, cartao: cid });

        if (scope === 'este') {
          fields.data = dateToStr(data);
          if (!isReceitaEdit) {
            const cardToUse = cartoes.find(c => c.id === cid) || null;
            const mrFatura = (forma === 'credito' && cardToUse) ? getMesReferenciaFatura(data, cardToUse) : null;
            fields.mes_referencia_fatura = mrFatura;
          }
          if (adrianoChanged) {
            if (isAdriano && !lancamento.adriano) {
              await supabase.from('lancamentos').delete().eq('id', lancamento.id);
              const metade = numValor / 2;
              const cardToUse = cartoes.find(c => c.id === cid) || null;
              const mrFatura = !isReceitaEdit && forma === 'credito' && cardToUse ? getMesReferenciaFatura(data, cardToUse) : null;
              const novoEspelho: Lancamento = {
                tipo: lancamento.tipo || 'despesa',
                descricao,
                valor: metade,
                data: dateToStr(data),
                categoria: isReceitaEdit ? receitaCatMapEdit[receitaCat] : (macro || ''),
                categoria_macro: macro,
                subcategoria: subcategoria || null,
                forma_pagamento: !isReceitaEdit ? forma : null,
                cartao_id: !isReceitaEdit ? cid : null,
                mes_referencia_fatura: !isReceitaEdit ? mrFatura : null,
                recorrente: lancamento.recorrente,
                recorrencia_pai_id: lancamento.recorrencia_pai_id,
                dia_recorrencia: lancamento.dia_recorrencia,
                subcategoria_pais: !isReceitaEdit ? 'Adriano' : null,
                adriano: true,
                pago_por: pagoPor,
                shared_group_id: genUUID(),
              } as Lancamento;
              await addMultiple.mutateAsync([novoEspelho]);
            } else if (!isAdriano && lancamento.adriano) {
              const subP = lancamento.subcategoria_pais || '';
              if (subP.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === 'adriano') {
                await supabase.from('lancamentos').delete().eq('shared_group_id', lancamento.shared_group_id!);
              } else {
                await updateLancamento.mutateAsync({ id: lancamento.id, ...fields });
              }
            }
          } else {
            await updateLancamento.mutateAsync({ id: lancamento.id, ...fields });
          }
        } else {
          // scope = futuras | todos
          if (adrianoChanged) {
            if (isAdriano && !lancamento.adriano) {
              const ids = items.filter(it => it.adriano !== true).map(it => it.id);
              if (ids.length > 0) await supabase.from('lancamentos').delete().in('id', ids);
              const cartas: Lancamento[] = [];
              for (const it of items) {
                if (it.adriano) continue;
                const itDate = new Date(it.data + 'T12:00:00');
                const metade = numValor / 2;
                const cardToUse = cartoes.find(c => c.id === cid) || null;
                const mrFatura = !isReceitaEdit && forma === 'credito' && cardToUse ? getMesReferenciaFatura(itDate, cardToUse) : null;
                const espelho: Lancamento = {
                  tipo: it.tipo || 'despesa',
                  descricao,
                  valor: metade,
                  data: it.data!,
                  categoria: isReceitaEdit ? receitaCatMapEdit[receitaCat] : (macro || ''),
                  categoria_macro: macro,
                  subcategoria: subcategoria || null,
                  forma_pagamento: !isReceitaEdit ? forma : null,
                  cartao_id: !isReceitaEdit ? cid : null,
                  mes_referencia_fatura: !isReceitaEdit ? mrFatura : null,
                  recorrente: it.recorrente,
                  recorrencia_pai_id: it.recorrencia_pai_id,
                  dia_recorrencia: it.dia_recorrencia,
                  subcategoria_pais: !isReceitaEdit ? 'Adriano' : null,
                  adriano: true,
                  pago_por: pagoPor,
                  shared_group_id: genUUID(),
                } as Lancamento;
                cartas.push(espelho);
              }
              await addMultiple.mutateAsync(cartas);
            } else if (!isAdriano && lancamento.adriano) {
              const subP = lancamento.subcategoria_pais || '';
              const norm = subP.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
              if (norm === 'adriano') {
                const groupIDs = Array.from(new Set(items.map(it => it.shared_group_id).filter(Boolean))) as string[];
                if (groupIDs.length > 0) {
                  for (const gid of groupIDs) {
                    await supabase.from('lancamentos').delete().eq('shared_group_id', gid);
                  }
                }
              } else {
                const ids = items.map(it => it.id);
                if (ids.length > 0) {
                  for (const id of ids) await updateLancamento.mutateAsync({ id, ...fields });
                }
              }
            }
          } else {
            const ids = items.map(it => it.id);
            if (ids.length > 0) {
              for (const id of ids) await updateLancamento.mutateAsync({ id, ...fields });
            }
          }
        }
        refetchAll();
        toast.success('Recorrências atualizadas', { duration: 1500 });
        onClose();
        return;
      }

    } catch (err) {
      console.error('Erro ao salvar:', err);
      toast.error('Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  };

  if (!open || !lancamento) return null;

  const isReceita = lancamento.tipo === 'receita';
  const wasParcelado = !!(lancamento.is_parcelado || lancamento.parcelamento_id);
  const wasRecorrente = !!(lancamento.recorrente || lancamento.recorrencia_pai_id);
  const wasSimples = !wasParcelado && !wasRecorrente;
  const selectedGroupData = selectedGroup ? SUBCATEGORIA_GROUPS.find(g => g.group === selectedGroup) : null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Modal inferior tipo sheet, igual ao NewExpenseSheetFixed */}
      <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl z-50 max-h-[90vh] overflow-y-auto">
        {/* Header sticky */}
        <div className="sticky top-0 bg-white px-5 pt-5 pb-3 border-b border-border/40 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold">Editar lançamento</h2>
          <button onClick={onClose} className="text-muted-foreground">
            <X size={22} />
          </button>
        </div>

        <div className="px-5 pt-4 pb-6 space-y-4">
          {/* Descrição */}
          <div className="space-y-1">
            <Input
              placeholder="Digite a descrição..."
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              className="h-11 rounded-2xl border-2 border-[#E8ECF5] bg-[#E8ECF5]/30 px-4 text-sm font-medium"
            />
          </div>

          {/* Valor e Data */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="R$ 0,00"
              value={valor}
              onChange={e => handleValorChange(e.target.value)}
              inputMode="numeric"
              className="h-11 rounded-2xl border-2 border-[#E8ECF5] bg-[#E8ECF5]/30 px-4 text-sm font-bold"
            />
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-11 rounded-2xl border-2 border-[#E8ECF5] bg-[#E8ECF5]/30 px-4 text-sm font-medium text-left flex items-center justify-between">
                  <span>{format(data, "dd/MM/yyyy", { locale: ptBR })}</span>
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={data}
                  onSelect={d => d && setData(d)}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Aviso de data em lote */}
          {(wasParcelado || wasRecorrente) && editScope !== 'este' && (
            <p className="text-[10px] text-amber-600 px-1">
              ⚠ A data só é alterada para "Só este lançamento". Em lote, as datas originais são preservadas.
            </p>
          )}

          {/* === RECEITA === */}
          {isReceita && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground px-1">Categoria</p>
              <div className="flex flex-wrap gap-2">
                {RECEITA_CATS_EDIT.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setReceitaCat(cat)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-medium transition-colors",
                      receitaCat === cat
                        ? "gradient-emerald text-primary-foreground"
                        : "bg-[#E8ECF5] text-muted-foreground"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* === DESPESA === */}
          {!isReceita && (
            <>
              {/* Categoria */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground px-1">Categoria</p>
                <div className="flex flex-wrap gap-2">
                  {SUBCATEGORIA_GROUPS.map(group => (
                    <button
                      key={group.group}
                      onClick={() => {
                        setSelectedGroup(group.group);
                        setSubcategoria(null);
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-medium transition-colors",
                        selectedGroup === group.group
                          ? "gradient-emerald text-primary-foreground"
                          : "bg-[#E8ECF5] text-muted-foreground"
                      )}
                    >
                      {group.emoji} {group.group}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subcategoria */}
              {selectedGroupData && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground px-1">Subcategoria</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedGroupData.items.map(item => (
                      <button
                        key={item.name}
                        onClick={() => setSubcategoria(item.name)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-medium transition-colors",
                          subcategoria === item.name
                            ? "gradient-emerald text-primary-foreground"
                            : "bg-[#E8ECF5] text-muted-foreground"
                        )}
                      >
                        {item.emoji} {item.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Forma de pagamento */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground px-1">Forma de pagamento</p>
                <div className="flex gap-1 p-1 rounded-xl bg-[#E8ECF5]">
                  {(['dinheiro', 'credito'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFormaPagamento(f)}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-xs font-semibold transition-all",
                        formaPagamento === f
                          ? "bg-white shadow-sm text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {f === 'dinheiro' ? '💵 Dinheiro' : '💳 Crédito'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cartões */}
              {formaPagamento === 'credito' && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground px-1">Cartão</p>
                  <div className="flex gap-2 flex-wrap">
                    {cartoes.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setCartaoId(c.id)}
                        className={cn(
                          "py-2 px-3 rounded-xl text-xs font-semibold transition-all",
                          cartaoId === c.id
                            ? "gradient-emerald text-primary-foreground"
                            : "bg-[#E8ECF5] text-muted-foreground"
                        )}
                      >
                        {c.nome}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Despesa dos Pais */}
              <button
                onClick={() => {
                  setIsPais(v => {
                    if (v) {
                      setIsVicente(false);
                      setIsLuisa(false);
                    }
                    return !v;
                  });
                }}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border-2 transition-all",
                  isPais ? "border-amber-400 bg-amber-50" : "border-[#E8ECF5] bg-[#E8ECF5]"
                )}
              >
                <div className="flex items-center gap-2">
                  <Users size={15} className={isPais ? "text-amber-600" : "text-muted-foreground"} />
                  <span className={cn("text-sm font-medium", isPais ? "text-amber-700" : "text-muted-foreground")}>
                    Despesa dos Pais
                  </span>
                </div>
                <div className={cn("w-9 h-5 rounded-full flex items-center px-0.5", isPais ? "bg-amber-400 justify-end" : "bg-muted justify-start")}>
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </div>
              </button>

              {/* Vicente e Luísa */}
              {isPais && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setIsVicente(v => !v);
                      setIsLuisa(false);
                    }}
                    className={cn(
                      "py-2 rounded-xl text-xs font-medium",
                      isVicente ? "bg-green-100 text-green-700" : "bg-[#E8ECF5] text-muted-foreground"
                    )}
                  >
                    👦 Vicente
                  </button>
                  <button
                    onClick={() => {
                      setIsLuisa(v => !v);
                      setIsVicente(false);
                    }}
                    className={cn(
                      "py-2 rounded-xl text-xs font-medium",
                      isLuisa ? "bg-pink-100 text-pink-700" : "bg-[#E8ECF5] text-muted-foreground"
                    )}
                  >
                    👩‍🦳 Luísa
                  </button>
                </div>
              )}

              {/* Dividir com Adriano */}
              <button
                disabled={isPais}
                onClick={() => setIsAdriano(v => !v)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border-2 transition-all",
                  isPais
                    ? "opacity-40 border-[#E8ECF5] bg-[#E8ECF5]"
                    : isAdriano
                    ? "border-blue-400 bg-blue-50"
                    : "border-[#E8ECF5] bg-[#E8ECF5]"
                )}
              >
                <span className={cn("text-sm font-medium", isAdriano ? "text-blue-700" : "text-muted-foreground")}>
                  👨 Dividir com Adriano
                </span>
                <div className={cn("w-9 h-5 rounded-full flex items-center px-0.5", isAdriano ? "bg-blue-400 justify-end" : "bg-muted justify-start")}>
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </div>
              </button>

              {/* Quem pagou (se Adriano ativo) */}
              {isAdriano && (
                <div className="flex gap-1 p-1 rounded-xl bg-[#E8ECF5]">
                  {([
                    { key: 'voce', label: '🙋‍♀️ Eu paguei' },
                    { key: 'adriano', label: '👨 Adriano pagou' }
                  ] as const).map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setPagoPor(opt.key)}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-xs font-semibold transition-all",
                        pagoPor === opt.key
                          ? "bg-white shadow-sm text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Converter em (só para simples) */}
              {wasSimples && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground px-1">Converter em</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setIsParcelado(v => !v);
                        if (!isParcelado) setRecorrente(false);
                      }}
                      className={cn(
                        "flex-1 px-4 py-2.5 rounded-2xl border-2 text-sm font-medium",
                        isParcelado
                          ? "border-primary/40 bg-primary/5 text-primary"
                          : "border-[#E8ECF5] bg-[#E8ECF5] text-muted-foreground"
                      )}
                    >
                      💳 Parcelar
                    </button>
                    <button
                      onClick={() => {
                        setRecorrente(v => !v);
                        if (!recorrente) setIsParcelado(false);
                      }}
                      className={cn(
                        "flex-1 px-4 py-2.5 rounded-2xl border-2 text-sm font-medium",
                        recorrente
                          ? "border-primary/40 bg-primary/5 text-primary"
                          : "border-[#E8ECF5] bg-[#E8ECF5] text-muted-foreground"
                      )}
                    >
                      🔁 Recorrente
                    </button>
                  </div>
                </div>
              )}

              {/* Número de parcelas */}
              {isParcelado && (
                <Input
                  type="number"
                  min={2}
                  max={48}
                  value={parcelas}
                  onChange={e => setParcelas(e.target.value)}
                  className="h-10 rounded-2xl border-2 border-[#E8ECF5] bg-[#E8ECF5]/30 px-4 text-sm font-medium"
                  placeholder="Parcelas"
                />
              )}

              {/* Dia da recorrência */}
              {recorrente && (
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={diaRecorrencia}
                  onChange={e => setDiaRecorrencia(e.target.value)}
                  className="h-10 rounded-2xl border-2 border-[#E8ECF5] bg-[#E8ECF5]/30 px-4 text-sm font-medium"
                  placeholder="Dia da recorrência"
                />
              )}

              {/* Escopo de edição (parcelado/recorrente) */}
              {(wasParcelado || wasRecorrente) && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground px-1">Aplicar alteração em</p>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { key: 'este', label: 'Só este lançamento' },
                      {
                        key: 'futuras',
                        label: wasParcelado ? 'Este e próximas parcelas' : 'Este e próximas recorrências'
                      },
                      {
                        key: 'todos',
                        label: wasParcelado ? 'Todas as parcelas' : 'Todas as recorrências'
                      }
                    ].map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => setEditScope(opt.key as EditScope)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all text-left",
                          editScope === opt.key
                            ? "border-primary/40 bg-primary/5 text-primary"
                            : "border-[#E8ECF5] bg-[#E8ECF5] text-muted-foreground"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                          editScope === opt.key ? "border-primary" : "border-muted-foreground/40"
                        )}>
                          {editScope === opt.key && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Botões de ação */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-secondary border-0 text-muted-foreground font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3.5 rounded-2xl gradient-emerald text-white font-bold shadow-lg disabled:opacity-60 active:scale-[0.99] transition-transform"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditLancamentoModal;
