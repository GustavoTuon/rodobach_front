import { describe, it, expect } from 'vitest';
import { summarizeClients, csvCell } from './client-analysis-model.js';

describe('indicadores da selecao de clientes', () => {
  it('mantem mesma populacao nos totais e na media', () => {
    const rows = [{totalPeriodo:100, totalAnoAnterior:50,lancamentos:2}, {totalPeriodo:300,totalAnoAnterior:150,lancamentos:3}];
    const all = summarizeClients(rows);
    expect(all.totalFaturado).toBe(400);
    expect(all.ticketMedio).toBe(200);
    expect(all.variacaoAnoAnterior).toBe(100);
    expect(summarizeClients(rows.slice(0,1)).totalFaturado).toBe(100);
  });
  it('nao inventa crescimento ou media sem base', () => {
    expect(summarizeClients([]).ticketMedio).toBeNull();
    expect(summarizeClients([{totalPeriodo:100}]).variacaoAnoAnterior).toBeNull();
  });
  it('neutraliza formulas e preserva aspas na exportacao', () => {
    expect(csvCell('=1+1')).toBe('"\'=1+1"');
    expect(csvCell('Cliente "A"')).toBe('"Cliente ""A"""');
    expect(csvCell(-10)).toBe('"-10"');
  });
});
