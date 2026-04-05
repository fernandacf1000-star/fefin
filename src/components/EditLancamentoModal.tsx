import { useEffect, useState } from ‘react’;
import { X, CalendarIcon, Users } from ‘lucide-react’;
import { format, addMonths } from ‘date-fns’;
import { ptBR } from ‘date-fns/locale’;
import { cn } from ‘@/lib/utils’;
import { Button } from ‘@/components/ui/button’;
import { Input } from ‘@/components/ui/input’;
import { Calendar } from ‘@/components/ui/calendar’;

import type { Lancamento } from ‘@/hooks/useLancamentos’;
import {
useUpdateLancamento,
useUpdateAllParcelamento,
useUpdateParcelamentoFuturas,
useAddMultipleLancamentos,
useUpdateFutureRecorrencia,
useUpdateAllRecorrencia,
} from ‘@/hooks/useLancamentos’;
import type { Cartao } from ‘@/hooks/useCartoes’;
import { SUBCATEGORIA_GROUPS, detectCategoriaMacro } from ‘@/lib/subcategorias’;
import { supabase } from ‘@/integrations/supabase/client’;

function getMesReferenciaFatura(dataCompra: Date, cartaoSelecionado: Cartao | null): string {
if (!cartaoSelecionado) {
return dataCompra.getFullYear() + ‘-’ + String(dataCompra.getMonth() + 1).padStart(2, ‘0’);
}
var diaCompra = dataCompra.getDate();
var diaFecha = cartaoSelecionado.dia_fechamento;
var diaVence = cartaoSelecionado.dia_vencimento ?? diaFecha + 5;
var mesFechamento = diaCompra <= diaFecha ? dataCompra : addMonths(dataCompra, 1);
var mesVencimento = diaVence > diaFecha ? mesFechamento : addMonths(mesFechamento, 1);
return mesVencimento.getFullYear() + ‘-’ + String(mesVencimento.getMonth() + 1).padStart(2, ‘0’);
}

var RECEITA_CATS_EDIT = [‘Salario’, ‘Reembolso Pais’, ‘Resgate’] as const;
type ReceitaCatEdit = (typeof RECEITA_CATS_EDIT)[number];
var receitaCatMapEdit: Record<ReceitaCatEdit, string> = {
‘Salario’: ‘salario’, ‘Reembolso Pais’: ‘reembolso_pais’, ‘Resgate’: ‘resgate_investimento’,
};
var receitaCatReverseMap: Record<string, ReceitaCatEdit> = Object.fromEntries(
Object.entries(receitaCatMapEdit).map(function([k, v]) { return [v, k as ReceitaCatEdit]; }),
);

interface Props {
open: boolean;
lancamento: Lancamento | null;
onClose: () => void;
onSave: (updates: Partial<Lancamento>) => Promise<void>;
cartoes: Cartao[];
}

type EditScope = ‘este’ | ‘futuras’ | ‘todos’;

function genUUID(): string {
if (typeof crypto !== ‘undefined’ && typeof crypto.randomUUID === ‘function’) {
return crypto.randomUUID();
}
return Date.now().toString(36) + ‘-’ + Math.random().toString(36).slice(2, 10);
}

var EditLancamentoModal = function({ open, lancamento, onClose, onSave, cartoes }: Props) {
var [descricao, setDescricao] = useState(’’);
var [valor, setValor] = useState(’’);
var [data, setData] = useState<Date>(new Date());
var [subcategoria, setSubcategoria] = useState<string | null>(null);
var [selectedGroup, setSelectedGroup] = useState<string | null>(null);
var [formaPagamento, setFormaPagamento] = useState<‘dinheiro’ | ‘credito’>(‘dinheiro’);
var [cartaoId, setCartaoId] = useState(’’);
var [saving, setSaving] = useState(false);
var [calendarOpen, setCalendarOpen] = useState(false);
var [isParcelado, setIsParcelado] = useState(false);
var [parcelas, setParcelas] = useState(‘2’);
var [recorrente, setRecorrente] = useState(false);
var [diaRecorrencia, setDiaRecorrencia] = useState(‘1’);
var [editScope, setEditScope] = useState<EditScope>(‘este’);
var [isPais, setIsPais] = useState(false);
var [isVicente, setIsVicente] = useState(false);
var [isLuisa, setIsLuisa] = useState(false);
var [isAdriano, setIsAdriano] = useState(false);
var [receitaCat, setReceitaCat] = useState<ReceitaCatEdit>(‘Salario’);

var updateLancamento = useUpdateLancamento();
var updateAll = useUpdateAllParcelamento();
var updateFuturas = useUpdateParcelamentoFuturas();
var addMultiple = useAddMultipleLancamentos();
var updateFuturasRecorrencia = useUpdateFutureRecorrencia();
var updateAllRecorrencia = useUpdateAllRecorrencia();

useEffect(function() {
if (!lancamento) return;
setDescricao(lancamento.descricao || ‘’);
setValor(Number(lancamento.valor).toLocaleString(‘pt-BR’, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
setData(lancamento.data ? new Date(lancamento.data + ‘T12:00:00’) : new Date());
setSubcategoria(lancamento.subcategoria || null);
var sub = lancamento.subcategoria || null;
if (sub) {
var grp = SUBCATEGORIA_GROUPS.find(function(g) { return g.items.some(function(i) { return i.name === sub; }); });
setSelectedGroup(grp ? grp.group : null);
} else {
setSelectedGroup(null);
}
setIsParcelado(lancamento.is_parcelado || false);
setParcelas(String(lancamento.parcela_total || 2));
setRecorrente(lancamento.recorrente || false);
setDiaRecorrencia(String(lancamento.dia_recorrencia || 1));
setEditScope(‘este’);
var subP = lancamento.subcategoria_pais;
setIsVicente(subP === ‘Vicente’);
setIsLuisa(subP === ‘Luisa’);
setIsPais(subP != null && subP !== ‘’);
setIsAdriano(lancamento.adriano || false);
if (lancamento.cartao_id) {
setFormaPagamento(‘credito’);
setCartaoId(lancamento.cartao_id);
} else {
setFormaPagamento(‘dinheiro’);
setCartaoId(’’);
}
setReceitaCat(receitaCatReverseMap[lancamento.categoria] || ‘Salario’);
}, [lancamento]);

var handleValorChange = function(raw: string) {
var digits = raw.replace(/\D/g, ‘’);
if (!digits) { setValor(’’); return; }
setValor((parseInt(digits, 10) / 100).toLocaleString(‘pt-BR’, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
};

var getNumValor = function() {
return parseFloat(valor.replace(/./g, ‘’).replace(’,’, ‘.’)) || 0;
};

var getSubPais = function() {
if (!isPais) return null;
if (isVicente) return ‘Vicente’;
if (isLuisa) return ‘Luisa’;
return subcategoria || detectCategoriaMacro(subcategoria || ‘’) || ‘Geral’;
};

var handleSave = async function() {
if (!lancamento || saving) return;
var numValor = getNumValor();
if (numValor <= 0) return;
setSaving(true);
try {
var macro = detectCategoriaMacro(subcategoria || ‘’) || null;
var forma = formaPagamento === ‘dinheiro’ ? ‘dinheiro’ : ‘credito’;
var cartao = formaPagamento === ‘credito’ ? cartaoId || null : null;
var novaData = format(data, ‘yyyy-MM-dd’);
var novoMesRef = data.getFullYear() + ‘-’ + String(data.getMonth() + 1).padStart(2, ‘0’);
var isReceitaEdit = lancamento.tipo === ‘receita’;
var cartaoObj = cartao ? cartoes.find(function(c) { return c.id === cartao; }) || null : null;
var mesRefFatura = !isReceitaEdit && forma === ‘credito’
? getMesReferenciaFatura(data, cartaoObj)
: novoMesRef;

```
  var wasAdriano = lancamento.adriano || false;
  var nowAdriano = !isReceitaEdit && isAdriano;
  var adrianoChanged = wasAdriano !== nowAdriano;

  var baseUpdates: Record<string, any> = {
    descricao: descricao,
    valor: numValor,
    subcategoria: subcategoria || null,
    categoria_macro: macro,
    forma_pagamento: isReceitaEdit ? null : forma,
    cartao_id: isReceitaEdit ? null : cartao,
    subcategoria_pais: isReceitaEdit ? null : getSubPais(),
    data: novaData,
    mes_referencia: mesRefFatura,
    adriano: false,
  };
  if (isReceitaEdit) {
    baseUpdates.categoria = receitaCatMapEdit[receitaCat];
  }

  var wasParcelado = lancamento.is_parcelado;
  var wasRecorrente = lancamento.recorrente;
  var wasSimples = !wasParcelado && !wasRecorrente;

  if (wasParcelado && adrianoChanged && nowAdriano) {
    var qp = supabase
      .from('lancamentos')
      .select('*')
      .eq('parcelamento_id', lancamento.parcelamento_id!);
    if (editScope === 'futuras') qp = qp.gte('data', lancamento.data);
    else if (editScope === 'este') qp = qp.eq('id', lancamento.id);
    var resParcelas = await qp;
    var affected = (resParcelas.data || []) as Lancamento[];

    var adrianoParcelamentoId = genUUID();
    var mirrorRows: any[] = [];

    for (var pi = 0; pi < affected.length; pi++) {
      var p = affected[pi];
      var updateFields: Record<string, any> = {
        descricao: descricao,
        valor: numValor / 2,
        subcategoria: subcategoria || null,
        categoria_macro: macro,
        forma_pagamento: isReceitaEdit ? null : forma,
        cartao_id: isReceitaEdit ? null : cartao,
        subcategoria_pais: isReceitaEdit ? null : getSubPais(),
        adriano: false,
      };
      if (p.id === lancamento.id) {
        updateFields.data = novaData;
        updateFields.mes_referencia = mesRefFatura;
      }
      await supabase
        .from('lancamentos')
        .update(updateFields as any)
        .eq('id', p.id);

      var mirrorData = p.id === lancamento.id ? novaData : p.data;
      var mirrorMesRef = p.id === lancamento.id ? mesRefFatura : p.mes_referencia;
      mirrorRows.push({
        descricao: descricao,
        valor: numValor / 2,
        tipo: 'despesa',
        categoria: lancamento.categoria || 'extra',
        subcategoria: subcategoria || null,
        categoria_macro: macro,
        forma_pagamento: forma,
        cartao_id: cartao,
        adriano: true,
        subcategoria_pais: isLuisa ? 'Luisa' : 'Adriano',
        data: mirrorData,
        mes_referencia: mirrorMesRef,
        is_parcelado: true,
        parcela_atual: p.parcela_atual,
        parcela_total: p.parcela_total,
        parcelamento_id: adrianoParcelamentoId,
        pago: false,
        recorrente: false,
        dia_recorrencia: null,
        recorrencia_ate: null,
        recorrencia_pai_id: null,
      });
    }
    if (mirrorRows.length > 0) await addMultiple.mutateAsync(mirrorRows as any);

  } else if (wasRecorrente && adrianoChanged && nowAdriano) {
    var qr = supabase
      .from('lancamentos')
      .select('*')
      .eq('recorrencia_pai_id', lancamento.recorrencia_pai_id!);
    if (editScope === 'futuras') qr = qr.gte('data', lancamento.data);
    else if (editScope === 'este') qr = qr.eq('id', lancamento.id);
    var resRecorrencias = await qr;
    var affectedR = (resRecorrencias.data || []) as Lancamento[];

    var adrianoPaiId = genUUID();
    var mirrorRowsR: any[] = [];

    for (var ri = 0; ri < affectedR.length; ri++) {
      var r = affectedR[ri];
      var updateFieldsR: Record<string, any> = {
        descricao: descricao,
        valor: numValor / 2,
        subcategoria: subcategoria || null,
        categoria_macro: macro,
        forma_pagamento: isReceitaEdit ? null : forma,
        cartao_id: isReceitaEdit ? null : cartao,
        subcategoria_pais: isReceitaEdit ? null : getSubPais(),
        adriano: false,
      };
      if (r.id === lancamento.id) {
        updateFieldsR.data = novaData;
        updateFieldsR.mes_referencia = mesRefFatura;
      }
      await supabase
        .from('lancamentos')
        .update(updateFieldsR as any)
        .eq('id', r.id);

      var mirrorDataR = r.id === lancamento.id ? novaData : r.data;
      var mirrorMesRefR = r.id === lancamento.id ? mesRefFatura : r.mes_referencia;
      mirrorRowsR.push({
        descricao: descricao,
        valor: numValor / 2,
        tipo: 'despesa',
        categoria: lancamento.categoria || 'extra',
        subcategoria: subcategoria || null,
        categoria_macro: macro,
        forma_pagamento: forma,
        cartao_id: cartao,
        adriano: true,
        subcategoria_pais: isLuisa ? 'Luisa' : 'Adriano',
        data: mirrorDataR,
        mes_referencia: mirrorMesRefR,
        is_parcelado: false,
        parcela_atual: null,
        parcela_total: null,
        parcelamento_id: null,
        pago: false,
        recorrente: true,
        dia_recorrencia: r.dia_recorrencia,
        recorrencia_ate: null,
        recorrencia_pai_id: adrianoPaiId,
      });
    }
    if (mirrorRowsR.length > 0) await addMultiple.mutateAsync(mirrorRowsR as any);

  } else if (wasSimples && adrianoChanged && nowAdriano && !isParcelado && !recorrente) {
    await updateLancamento.mutateAsync({
      id: lancamento.id,
      descricao: descricao,
      valor: numValor / 2,
      subcategoria: subcategoria || null,
      categoria_macro: macro,
      forma_pagamento: forma,
      cartao_id: cartao,
      subcategoria_pais: getSubPais(),
      data: novaData,
      mes_referencia: mesRefFatura,
      adriano: false,
    } as any);
    await addMultiple.mutateAsync([{
      descricao: descricao,
      valor: numValor / 2,
      tipo: 'despesa' as const,
      categoria: lancamento.categoria || 'extra',
      subcategoria: subcategoria || null,
      categoria_macro: macro,
      forma_pagamento: forma,
      cartao_id: cartao,
      adriano: true,
      subcategoria_pais: isLuisa ? 'Luisa' : 'Adriano',
      data: novaData,
      mes_referencia: mesRefFatura,
      is_parcelado: false,
      parcela_atual: null,
      parcela_total: null,
      parcelamento_id: null,
      pago: false,
      recorrente: false,
      dia_recorrencia: null,
      recorrencia_ate: null,
      recorrencia_pai_id: null,
    }] as any);

  } else if (adrianoChanged && !nowAdriano) {
    await updateLancamento.mutateAsync({
      id: lancamento.id,
      descricao: descricao,
      valor: numValor * 2,
      subcategoria: subcategoria || null,
      categoria_macro: macro,
      forma_pagamento: forma,
      cartao_id: cartao,
      subcategoria_pais: getSubPais(),
      data: novaData,
      mes_referencia: mesRefFatura,
      adriano: false,
    } as any);
    await supabase
      .from('lancamentos')
      .delete()
      .eq('adriano', true)
      .eq('descricao', lancamento.descricao)
      .eq('data', lancamento.data);

  } else if (wasSimples && isParcelado && !recorrente) {
    var nParcelas = parseInt(parcelas, 10) || 2;
    var parcelamentoId = genUUID();
    await updateLancamento.mutateAsync({
      id: lancamento.id,
      descricao: descricao,
      valor: numValor,
      subcategoria: subcategoria || null,
      categoria_macro: macro,
      forma_pagamento: forma,
      cartao_id: cartao,
      subcategoria_pais: getSubPais(),
      data: novaData,
      mes_referencia: mesRefFatura,
      adriano: false,
      is_parcelado: true,
      parcela_atual: 1,
      parcela_total: nParcelas,
      parcelamento_id: parcelamentoId,
    } as any);
    var rowsP: any[] = [];
    for (var ip = 1; ip < nParcelas; ip++) {
      var dp = addMonths(data, ip);
      var dpStr = dp.getFullYear() + '-' + String(dp.getMonth() + 1).padStart(2, '0') + '-' + String(data.getDate()).padStart(2, '0');
      rowsP.push({
        descricao: descricao,
        valor: numValor,
        tipo: 'despesa',
        categoria: lancamento.categoria || 'extra',
        subcategoria: subcategoria || null,
        categoria_macro: macro,
        forma_pagamento: forma,
        cartao_id: cartao,
        subcategoria_pais: getSubPais(),
        data: dpStr,
        mes_referencia: getMesReferenciaFatura(dp, cartaoObj),
        parcela_atual: ip + 1,
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
    if (rowsP.length > 0) await addMultiple.mutateAsync(rowsP);

  } else if (wasSimples && recorrente && !isParcelado) {
    var diaR = parseInt(diaRecorrencia, 10) || 1;
    var paiIdR = genUUID();
    await updateLancamento.mutateAsync({
      id: lancamento.id,
      descricao: descricao,
      valor: numValor,
      subcategoria: subcategoria || null,
      categoria_macro: macro,
      forma_pagamento: forma,
      cartao_id: cartao,
      subcategoria_pais: getSubPais(),
      data: novaData,
      mes_referencia: mesRefFatura,
      adriano: false,
      recorrente: true,
      dia_recorrencia: diaR,
      recorrencia_pai_id: paiIdR,
      is_parcelado: false,
      parcela_atual: null,
      parcela_total: null,
      parcelamento_id: null,
    } as any);
    var rowsRec: any[] = [];
    for (var ir = 1; ir < 24; ir++) {
      var mr = addMonths(data, ir);
      var daysInMonth = new Date(mr.getFullYear(), mr.getMonth() + 1, 0).getDate();
      var dataRecorrente = new Date(mr.getFullYear(), mr.getMonth(), Math.min(diaR, daysInMonth));
      var drStr = mr.getFullYear() + '-' + String(mr.getMonth() + 1).padStart(2, '0') + '-' + String(Math.min(diaR, daysInMonth)).padStart(2, '0');
      rowsRec.push({
        descricao: descricao,
        valor: numValor,
        tipo: 'despesa',
        categoria: lancamento.categoria || 'extra',
        subcategoria: subcategoria || null,
        categoria_macro: macro,
        forma_pagamento: forma,
        cartao_id: cartao,
        subcategoria_pais: getSubPais(),
        data: drStr,
        mes_referencia: getMesReferenciaFatura(dataRecorrente, cartaoObj),
        parcela_atual: null,
        parcela_total: null,
        is_parcelado: false,
        parcelamento_id: null,
        pago: false,
        recorrente: true,
        dia_recorrencia: diaR,
        recorrencia_ate: null,
        recorrencia_pai_id: paiIdR,
        adriano: false,
      });
    }
    await addMultiple.mutateAsync(rowsRec);

  } else if (wasParcelado) {
    if (editScope === 'este') {
      await updateLancamento.mutateAsync({ id: lancamento.id, ...baseUpdates, data: novaData } as any);
    } else if (editScope === 'futuras') {
      await updateFuturas.mutateAsync({
        parcelamento_id: lancamento.parcelamento_id!,
        fromDate: lancamento.data,
        updates: baseUpdates,
      });
    } else {
      await updateAll.mutateAsync({ parcelamento_id: lancamento.parcelamento_id!, updates: baseUpdates });
    }

  } else if (wasRecorrente) {
    if (editScope === 'este') {
      await updateLancamento.mutateAsync({ id: lancamento.id, ...baseUpdates, data: novaData } as any);
    } else if (editScope === 'futuras') {
      await updateFuturasRecorrencia.mutateAsync({
        recorrencia_pai_id: lancamento.recorrencia_pai_id!,
        fromDate: lancamento.data,
        updates: baseUpdates,
      });
    } else {
      await updateAllRecorrencia.mutateAsync({
        recorrencia_pai_id: lancamento.recorrencia_pai_id!,
        updates: baseUpdates,
      });
    }

  } else {
    await onSave(baseUpdates);
  }
  onClose();
} finally {
  setSaving(false);
}
```

};

if (!open || !lancamento) return null;
var isReceita = lancamento.tipo === ‘receita’;
var wasParcelado = lancamento.is_parcelado;
var wasRecorrente = lancamento.recorrente;
var wasSimples = !wasParcelado && !wasRecorrente;

return (
<>
<div className='fixed inset-0 z-[80] bg-black/25 backdrop-blur-sm' onClick={onClose} />
<div className='fixed inset-x-4 top-1/2 -translate-y-1/2 z-[90] max-h-[88vh] overflow-y-auto rounded-3xl bg-white shadow-xl border border-border'>
<div className='px-5 pt-5 pb-8 space-y-4'>
<div className='flex items-center justify-between'>
<h2 className='text-base font-bold text-foreground'>Editar lancamento</h2>
<button onClick={onClose} className='p-1.5 rounded-full hover:bg-secondary'>
<X size={17} className='text-muted-foreground' />
</button>
</div>

```
      <div className='space-y-1.5'>
        <label className='text-xs font-medium text-muted-foreground'>Descricao</label>
        <Input value={descricao} onChange={function(e) { setDescricao(e.target.value); }} className='bg-[#E8ECF5] border-0 rounded-xl' />
      </div>

      <div className='space-y-1.5'>
        <label className='text-xs font-medium text-muted-foreground'>Valor</label>
        <div className='relative'>
          <span className='absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground'>R$</span>
          <Input value={valor} onChange={function(e) { handleValorChange(e.target.value); }}
            className='bg-[#E8ECF5] border-0 pl-9 text-base font-bold rounded-xl' inputMode='numeric' />
        </div>
      </div>

      <div className='space-y-1.5'>
        <label className='text-xs font-medium text-muted-foreground'>Data</label>
        <Button variant='outline' className='w-full justify-start bg-[#E8ECF5] border-0 text-foreground text-sm rounded-xl'
          onClick={function() { setCalendarOpen(function(v) { return !v; }); }}>
          <CalendarIcon className='mr-2 h-4 w-4 text-muted-foreground' />
          {format(data, "dd 'de' MMMM, yyyy", { locale: ptBR })}
        </Button>
        {calendarOpen && (
          <div className='rounded-xl overflow-hidden border border-border bg-white shadow-md'>
            <Calendar mode='single' selected={data}
              onSelect={function(d) { if (d) { setData(d); setCalendarOpen(false); } }}
              initialFocus className='p-3 pointer-events-auto' />
          </div>
        )}
      </div>

      {isReceita && (
        <div className='space-y-2'>
          <label className='text-xs font-medium text-muted-foreground'>Categoria</label>
          <div className='flex flex-wrap gap-1.5'>
            {RECEITA_CATS_EDIT.map(function(cat) {
              return (
                <button key={cat} onClick={function() { setReceitaCat(cat); }}
                  className={cn('px-3 py-1.5 rounded-xl text-xs font-medium transition-colors',
                    receitaCat === cat ? 'gradient-emerald text-primary-foreground' : 'bg-[#E8ECF5] text-muted-foreground')}>
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!isReceita && (
        <div className='space-y-2'>
          <label className='text-xs font-medium text-muted-foreground'>Categoria</label>
          <div className='grid grid-cols-4 gap-1.5'>
            {SUBCATEGORIA_GROUPS.map(function(group) {
              var isActive = selectedGroup === group.group;
              var hasSelection = group.items.some(function(i) { return i.name === subcategoria; });
              return (
                <button key={group.group}
                  onClick={function() { setSelectedGroup(isActive ? null : group.group); }}
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
          {selectedGroup && (function() {
            var group = SUBCATEGORIA_GROUPS.find(function(g) { return g.group === selectedGroup; });
            if (!group) return null;
            return (
              <div className='rounded-xl p-2.5 space-y-1.5' style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}>
                <p className='text-[9px] font-semibold text-primary uppercase tracking-wider'>{group.group}</p>
                <div className='flex flex-wrap gap-1.5'>
                  {group.items.map(function(item) {
                    return (
                      <button key={item.name}
                        onClick={function() { setSubcategoria(subcategoria === item.name ? null : item.name); }}
                        className={cn('px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors',
                          subcategoria === item.name ? 'bg-primary text-primary-foreground' : 'bg-white border border-border text-muted-foreground')}>
                        {item.name}
                      </button>
                    );
                  })}
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
            {(['dinheiro', 'credito'] as const).map(function(f) {
              return (
                <button key={f} onClick={function() { setFormaPagamento(f); }}
                  className={cn('flex-1 py-2 rounded-lg text-xs font-semibold transition-all',
                    formaPagamento === f ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground')}>
                  {f === 'dinheiro' ? 'Dinheiro' : 'Credito'}
                </button>
              );
            })}
          </div>
          {formaPagamento === 'credito' && cartoes.length > 0 && (
            <div className='flex gap-2 flex-wrap'>
              {cartoes.map(function(c) {
                return (
                  <button key={c.id} onClick={function() { setCartaoId(c.id); }}
                    className={cn('px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors',
                      cartaoId === c.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-white border-border text-muted-foreground')}>
                    {c.nome}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!isReceita && (
        <>
          <button
            onClick={function() {
              setIsPais(function(v) {
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

          {isPais && (
            <button
              onClick={function() { setIsVicente(function(v) { return !v; }); }}
              className={cn('w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border-2 transition-all',
                isVicente ? 'border-green-400 bg-green-50' : 'border-[#E8ECF5] bg-[#E8ECF5]')}>
              <div className='flex items-center gap-2'>
                <span className='text-base'>{'👦'}</span>
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

          <button
            onClick={function() { setIsAdriano(function(v) { return !v; }); }}
            className={cn('w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border-2 transition-all',
              isAdriano ? 'border-blue-400 bg-blue-50' : 'border-[#E8ECF5] bg-[#E8ECF5]')}>
            <div className='flex items-center gap-2'>
              <span className='text-base'>{'👨'}</span>
              <span className={cn('text-sm font-medium', isAdriano ? 'text-blue-700' : 'text-muted-foreground')}>
                Dividir com Adriano
              </span>
            </div>
            <div className={cn('w-9 h-5 rounded-full flex items-center px-0.5 transition-all',
              isAdriano ? 'bg-blue-400 justify-end' : 'bg-muted justify-start')}>
              <div className='w-4 h-4 rounded-full bg-white shadow-sm' />
            </div>
          </button>

          {isAdriano && (
            <button
              onClick={function() { setIsLuisa(function(v) { return !v; }); }}
              className={cn('w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border-2 transition-all ml-4',
                isLuisa ? 'border-pink-400 bg-pink-50' : 'border-[#E8ECF5] bg-[#E8ECF5]')}>
              <div className='flex items-center gap-2'>
                <span className='text-base'>{'\u{1F469}\u200D\u{1F9B3}'}</span>
                <span className={cn('text-sm font-medium', isLuisa ? 'text-pink-700' : 'text-muted-foreground')}>
                  Despesa da Luisa
                </span>
              </div>
              <div className={cn('w-9 h-5 rounded-full flex items-center px-0.5 transition-all',
                isLuisa ? 'bg-pink-400 justify-end' : 'bg-muted justify-start')}>
                <div className='w-4 h-4 rounded-full bg-white shadow-sm' />
              </div>
            </button>
          )}
        </>
      )}

      {!isReceita && wasSimples && (
        <div className='space-y-2'>
          <label className='text-xs font-medium text-muted-foreground'>Converter em</label>
          <div className='flex gap-2'>
            <button
              onClick={function() { setIsParcelado(function(v) { return !v; }); if (!isParcelado) setRecorrente(false); }}
              className={cn('flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium border transition-all',
                isParcelado ? 'border-primary/40 bg-primary/5 text-primary' : 'border-[#E8ECF5] bg-[#E8ECF5] text-muted-foreground')}>
              <span>Parcelado</span>
              {isParcelado && (
                <input type='number' min={2} max={48} value={parcelas}
                  onChange={function(e) { setParcelas(e.target.value); }} onClick={function(e) { e.stopPropagation(); }}
                  className='w-10 text-center bg-white rounded-lg border border-border text-xs font-bold text-foreground' inputMode='numeric' />
              )}
            </button>
            <button
              onClick={function() { setRecorrente(function(v) { return !v; }); if (!recorrente) setIsParcelado(false); }}
              className={cn('flex-1 flex items-center justify-center px-3 py-2.5 rounded-xl text-sm font-medium border transition-all',
                recorrente ? 'border-primary/40 bg-primary/5 text-primary' : 'border-[#E8ECF5] bg-[#E8ECF5] text-muted-foreground')}>
              Recorrente
            </button>
          </div>
          {recorrente && (
            <div className='flex items-center gap-2 px-1'>
              <span className='text-xs text-muted-foreground'>Repetir no dia</span>
              <Input type='number' min={1} max={31} value={diaRecorrencia}
                onChange={function(e) { setDiaRecorrencia(e.target.value); }}
                className='bg-[#E8ECF5] border-0 w-16 text-center rounded-xl' inputMode='numeric' />
              <span className='text-xs text-muted-foreground'>de cada mes</span>
            </div>
          )}
        </div>
      )}

      {!isReceita && (wasParcelado || wasRecorrente) && (
        <div className='space-y-2'>
          <label className='text-xs font-medium text-muted-foreground'>Aplicar alteracao em</label>
          <div className='flex flex-col gap-1.5'>
            {[
              { key: 'este', label: 'So este lancamento' },
              { key: 'futuras', label: wasParcelado ? 'Este e proximas parcelas' : 'Este e proximas recorrencias' },
              { key: 'todos', label: wasParcelado ? 'Todas as parcelas' : 'Todas as recorrencias' },
            ].map(function(opt) {
              return (
                <button key={opt.key} onClick={function() { setEditScope(opt.key as EditScope); }}
                  className={cn('flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all text-left',
                    editScope === opt.key ? 'border-primary/40 bg-primary/5 text-primary' : 'border-[#E8ECF5] bg-[#E8ECF5] text-muted-foreground')}>
                  <div className={cn('w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                    editScope === opt.key ? 'border-primary' : 'border-muted-foreground/40')}>
                    {editScope === opt.key && <div className='w-2 h-2 rounded-full bg-primary' />}
                  </div>
                  {opt.label}
                </button>
              );
            })}
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
```

);
};

export default EditLancamentoModal;