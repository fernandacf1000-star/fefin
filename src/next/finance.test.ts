import { describe, expect, it } from 'vitest';
import { paymentDate, bestCard, installmentValues, monthRef } from './finance';
const c = (id: string, close: number, due: number) => ({id,nome:id,dia_fechamento:close,dia_vencimento:due});
describe('novo Fefin: prazo real dos cartões',()=>{
 it('usa vencimento, não apenas distância do fechamento',()=>{
  const result=bestCard([c('A',20,21),c('B',18,15)],new Date(2026,9,17));
  expect(result?.card.id).toBe('B');expect(monthRef(result!.due)).toBe('2026-11');
 });
 it('leva compra após fechamento ao próximo ciclo',()=>expect(monthRef(paymentDate(c('A',10,20),new Date(2026,9,11))!)).toBe('2026-11'));
 it('trata dezembro e janeiro',()=>expect(monthRef(paymentDate(c('A',20,10),new Date(2026,11,21))!)).toBe('2027-02'));
 it('limita dias 31 em fevereiro',()=>expect(paymentDate(c('A',25,31),new Date(2027,1,20))?.getDate()).toBe(28));
 it('ignora dados inválidos',()=>expect(bestCard([c('A',0,40)],new Date())).toBeNull());
 it('mantém compra no dia do fechamento no ciclo conservador',()=>expect(monthRef(paymentDate(c('A',10,20),new Date(2026,9,10))!)).toBe('2026-10'));
});
describe('parcelamento',()=>{
 it('preserva centavos no total',()=>expect(installmentValues(100,3)).toEqual([33.34,33.33,33.33]));
 it('rejeita quantidade inválida',()=>expect(()=>installmentValues(100,0)).toThrow());
 it('rejeita zero e valores não numéricos',()=>{expect(()=>installmentValues(0,1)).toThrow();expect(()=>installmentValues(NaN,1)).toThrow();});
});
