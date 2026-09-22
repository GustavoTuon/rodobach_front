import {it,expect} from 'vitest';
import {tvAtBase,tvExpireManual} from './screens/painel-tv-model.js';
it('expira a confirmação na tela mesmo quando a atualização da API falha',()=>{
 const item={confirmacaoManual:{expiraEm:'2026-09-16T14:00:00Z'},carga:{codigo:'carregado'}};
 expect(tvExpireManual(item,new Date('2026-09-16T13:00:00Z'))).toBe(item);
 expect(tvExpireManual(item,new Date('2026-09-16T14:00:00Z')).carga.codigo).toBe('conferir');
 expect(tvExpireManual(item,new Date('2026-09-16T14:00:00Z')).confirmacaoManual).toBeNull();
});
it('destaca apenas presença recente confirmada, não retorno histórico ou posição vencida',()=>{
 const now=new Date('2026-09-16T14:00:00Z');
 const item={base:{situacao:'retornou',presenca:{naBase:true,observadoEm:'2026-09-16T13:50:00Z'}}};
 expect(tvAtBase(item,now)).toBe(true);
 expect(tvAtBase({base:{situacao:'retornou'}},now)).toBe(false);
 expect(tvAtBase(item,new Date('2026-09-16T15:00:00Z'))).toBe(false);
 item.base.presenca.naBase=false;expect(tvAtBase(item,now)).toBe(false);
});
