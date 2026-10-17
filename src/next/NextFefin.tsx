import { useState } from 'react';
import { format, addMonths } from 'date-fns';
import { CreditCard, Home, List, Plus, Sparkles, ArrowUpRight, ArrowLeft, ChevronRight } from 'lucide-react';
import { useLancamentos, useAddMultipleLancamentos } from '@/hooks/useLancamentos';
import { useCartoes } from '@/hooks/useCartoes';
import { useAuth } from '@/hooks/useAuth';
import SmartImportSheet from '@/components/SmartImportSheet';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { bestCard, monthRef, paymentDate, installmentValues } from './finance';
import './next.css';

const money = (value: number) => value.toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
export default function NextFefin() {
  const [tab, setTab] = useState<'today'|'list'>('today');
  const [month, setMonth] = useState(() => monthRef(new Date()));
  const [entry, setEntry] = useState(false);
  const [ai, setAi] = useState(false);
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const {data: rows = [], isLoading, isError, refetch} = useLancamentos(month);
  const {data: cards = [], isLoading: cardsLoading, isError: cardsError} = useCartoes();
  const {user} = useAuth();
  const best = bestCard(cards, new Date());
  const expenses = rows.filter(r => r.tipo === 'despesa' && !r.adriano && !r.subcategoria_pais);
  const pending = expenses.filter(r => !r.pago).reduce((s,r)=>s+Number(r.valor),0);
  const total = expenses.reduce((s,r)=>s+Number(r.valor),0);
  const list = [...rows].filter(r=>!r.adriano && r.descricao.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>b.data.localeCompare(a.data)||b.created_at.localeCompare(a.created_at));
  return <div className="nf">
    <header className="nf-header"><a href="/novo" className="nf-brand">fe<span>fin</span><small>um pouco mais simples</small></a><span className="nf-tag">Nova versão</span></header>
    <main className="nf-main">
      <div className="nf-heading"><p>SEU DINHEIRO, COM CLAREZA</p><h1>{tab === 'today' ? 'Uma coisa de cada vez.' : 'Seus movimentos.'}</h1><p className="nf-sub">{tab === 'today' ? 'O essencial para cuidar do seu mês.' : 'Os registros mais recentes aparecem primeiro.'}</p></div>
      {notice && <div role="status" className="nf-notice">{notice}<button onClick={()=>setNotice('')} aria-label="Fechar mensagem">×</button></div>}
      {tab === 'today' && <section className="nf-best" aria-labelledby="best-heading"><div className="nf-eyebrow"><CreditCard size={19}/><h2 id="best-heading">Melhor cartão para usar hoje</h2></div>
        {cardsLoading ? <p>Consultando seus cartões…</p> : cardsError ? <p>Não foi possível consultar os cartões agora.</p> : best ? <><h3>{best.card.nome}</h3><p>Uma compra hoje deve vencer em <strong>{format(best.due,'dd/MM/yyyy')}</strong>.</p><span className="nf-pill">Mais tempo até pagar <ArrowUpRight size={14}/></span><small>Estimativa pelo fechamento e vencimento cadastrados. No dia do fechamento, a fatura pode variar conforme o banco.</small></> : <><h3>Seu cartão, no melhor dia.</h3><p>Cadastre o fechamento e o vencimento para comparar os prazos.</p><a href="/conta">Cadastrar cartões <ChevronRight size={16}/></a></>}
      </section>}
      <div className="nf-month"><label htmlFor="nf-month">Mês de referência</label><input id="nf-month" type="month" value={month} onChange={e=>{if(e.target.value)setMonth(e.target.value);}} /></div>
      {isLoading ? <p role="status">Carregando seus registros…</p> : isError ? <div role="alert" className="nf-card">Não foi possível carregar os valores. <button onClick={()=>refetch()}>Tentar novamente</button></div> : tab === 'today' ? <>
        <div className="nf-stats"><section className="nf-card"><p>Meus gastos do mês</p><h2>{money(total)}</h2><small>Sua parte dos lançamentos. Gastos identificados como família ficam separados.</small></section><section className="nf-card"><p>Pendentes registrados</p><h2>{money(pending)}</h2><small>Itens ainda não marcados como pagos. Não é o saldo da sua conta.</small></section></div>
        <button className="nf-primary" onClick={()=>setEntry(true)}><Plus size={20}/> Registrar gasto</button>
        <button className="nf-ai" onClick={()=>setAi(true)}><Sparkles size={18}/><span>Deixe a IA preencher<small>Escreva uma frase ou envie um print</small></span><ChevronRight size={18}/></button>
        <div className="nf-section-title"><h2>Últimos registros</h2><button onClick={()=>setTab('list')}>Ver todos</button></div>
        <div className="nf-card nf-transactions">{list.slice(0,3).map(r=><div className="nf-row" key={r.id}><span>{r.descricao}<small>{format(new Date(r.data+'T12:00:00'),'dd/MM')} {r.subcategoria_pais ? '· Família' : ''}</small></span><strong>{r.tipo==='receita'?'+':'−'} {money(Number(r.valor))}</strong></div>)}{list.length===0&&<p>Seu mês começa com um registro. Não precisa organizar tudo agora.</p>}</div>
      </> : <><label className="nf-search">Buscar um registro<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Ex.: mercado" /></label><div className="nf-card nf-transactions">{list.map(r=><div className="nf-row" key={r.id}><span>{r.descricao}<small>{format(new Date(r.data+'T12:00:00'),'dd/MM/yyyy')}{r.is_parcelado ? ` · ${r.parcela_atual}/${r.parcela_total}`:''}{r.subcategoria_pais?' · Família':''}</small></span><strong>{r.tipo==='receita'?'+':'−'} {money(Number(r.valor))}</strong></div>)}{!list.length&&<p>Nenhum registro encontrado.</p>}</div></>}
      <a className="nf-legacy" href="/dashboard"><ArrowLeft size={15}/> Abrir o Fefin completo</a>
    </main>
    <nav className="nf-nav" aria-label="Navegação principal"><button aria-current={tab==='today'?'page':undefined} onClick={()=>setTab('today')}><Home size={20}/>Hoje</button><button className="nf-nav-add" onClick={()=>setEntry(true)}><Plus size={20}/>Registrar</button><button aria-current={tab==='list'?'page':undefined} onClick={()=>setTab('list')}><List size={20}/>Movimentos</button></nav>
    <Entry key={user?.id} open={entry} onClose={()=>setEntry(false)} onSaved={()=>{setEntry(false);setNotice('Gasto salvo. Tudo certo por aqui.');}} onAi={()=>{setEntry(false);setAi(true);}} />
    {ai && <SmartImportSheet open={ai} onClose={()=>setAi(false)}/>}
  </div>;
}

function Entry({open,onClose,onSaved,onAi}:{open:boolean;onClose:()=>void;onSaved:()=>void;onAi:()=>void}) {
  const {data:cards=[]}=useCartoes();
  const add=useAddMultipleLancamentos();
  const [value,setValue]=useState(''); const [description,setDescription]=useState(''); const [payment,setPayment]=useState('');
  const [date,setDate]=useState(()=>format(new Date(),'yyyy-MM-dd')); const [count,setCount]=useState(1); const [error,setError]=useState('');
  const best=bestCard(cards,new Date());
  const selected=payment || (best?best.card.id:'pix');
  async function save(e:React.FormEvent) {
    e.preventDefault(); if(add.isPending)return; setError('');
    try {
      const amount=Number(value.replace(/\s/g,'').replace(/\./g,'').replace(',','.'));
      if(!description.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Preencha a descrição e confira a data.');
      const card=cards.find(c=>c.id===selected); const n=card?count:1;
      const values=installmentValues(amount,n); const purchase=new Date(date+'T12:00:00');
      const due=card?paymentDate(card,purchase):purchase;
      if(!due)throw Error('Confira o fechamento e o vencimento do cartão.');
      const group=n>1?crypto.randomUUID():null;
      await add.mutateAsync(values.map((v,i)=>({descricao:description.trim(),valor:v,tipo:'despesa',categoria:'despesa',data:date,mes_referencia:monthRef(addMonths(due,i)),forma_pagamento:card?'credito':selected,cartao_id:card?.id||null,pago:!card,is_parcelado:n>1,parcela_atual:n>1?i+1:null,parcela_total:n>1?n:null,parcelamento_id:group,pago_por:'voce'})));
      setValue('');setDescription('');setCount(1);setDate(format(new Date(),'yyyy-MM-dd'));onSaved();
    } catch(err) {setError(err instanceof Error?err.message:'Não foi possível salvar. Seus campos foram mantidos.');}
  }
  return <Dialog open={open} onOpenChange={v=>{if(!v&&!add.isPending)onClose();}}><DialogContent className="nf-dialog"><DialogTitle>Registrar gasto</DialogTitle><DialogDescription>Preencha o essencial. Você pode completar os detalhes depois.</DialogDescription>
    <button className="nf-ai" onClick={onAi} disabled={add.isPending}><Sparkles size={18}/> Preencher com IA · texto ou print</button>
    <form onSubmit={save}><label>Quanto foi? <input autoFocus inputMode="decimal" placeholder="0,00" value={value} onChange={e=>setValue(e.target.value)} required/></label><label>Com o quê?<input placeholder="Ex.: mercado" value={description} onChange={e=>setDescription(e.target.value)} required/></label><label>Como pagou?<select value={selected} onChange={e=>setPayment(e.target.value)}><option value="pix">Pix</option><option value="debito">Débito</option><option value="dinheiro">Dinheiro</option>{cards.map(c=><option key={c.id} value={c.id}>{c.nome}{best?.card.id===c.id?' · maior prazo hoje':''}</option>)}</select></label>
    <details><summary>Data e parcelamento</summary><label>Data<input type="date" value={date} onChange={e=>setDate(e.target.value)} required/></label>{cards.some(c=>c.id===selected)&&<label>Número de parcelas<input type="number" min={1} max={48} value={count} onChange={e=>setCount(Number(e.target.value))}/><small>Informe acima o valor total da compra.</small></label>}</details>
    {error&&<p role="alert" className="nf-error">{error}</p>}<button className="nf-primary" disabled={add.isPending}>{add.isPending?'Salvando…':'Salvar gasto'}</button><p className="nf-draft">Ao fechar, os campos ficam guardados enquanto esta página estiver aberta.</p></form>
  </DialogContent></Dialog>;
}
