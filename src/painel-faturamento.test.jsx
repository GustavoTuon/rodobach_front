// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor,within} from '@testing-library/react';
import Panel,{RevenueCard,RevenueSummary} from './screens/painel-faturamento.jsx';
afterEach(cleanup);
it('resumo contabiliza todos os veículos, incluindo amarelos e sem avaliação',()=>{
 const statuses=['acima','acima','acima','atencao','atencao','atencao','abaixo','abaixo','abaixo','abaixo','sem_base'];
 render(<RevenueSummary data={{...data,items:statuses.map((status,index)=>({...item,plate:String(index),status}))}}/>);
 for(const [label,count] of [['NO RITMO DA META','03'],['PRÓXIMOS DA META','03'],['ABAIXO DO RITMO','04'],['SEM AVALIAÇÃO','01']]) {
  expect(within(screen.getByLabelText(label)).getByText(count)).toBeTruthy();
 }
});
const item={plate:'ABC1234',driver:'Motorista exemplo',actual:4000,target:30000,expected:4000,pace:100,status:'acima',gap:0,sampleMonths:10,yearRevenue:304000,history:[],series:[{day:0,revenue:0,expected:0},{day:4,revenue:4000,expected:4000}]};
const data={items:[item],period:{days:30,elapsed:4,cutoff:'2026-11-04'},summary:{vehicles:1,actual:4000,target:30000,withTarget:1,above:1,below:0},updatedAt:'2026-11-05T15:00:00Z',method:{source:'CT-es emitidos'}};
it('mostra faturamento e gráfico acessível e filtra sem inventar veículos',async()=>{
 window.RB_API={getFleetRevenue:vi.fn().mockResolvedValue(data)};
 render(<Panel/>);expect(await screen.findByRole('article',{name:'Veículo ABC1234'})).toBeTruthy();
 expect(screen.getByRole('img',{name:/Faturamento acumulado de ABC1234/})).toBeTruthy();
 fireEvent.change(screen.getByPlaceholderText('Placa ou motorista'),{target:{value:'ZZZ'}});
 expect(screen.queryByRole('article')).toBeNull();expect(screen.getByText(/Nenhum veículo encontrado/)).toBeTruthy();
});
it('falha de consulta não mostra faturamento zero e permite nova tentativa',async()=>{
 window.RB_API={getFleetRevenue:vi.fn().mockRejectedValueOnce(new Error('ERP indisponível')).mockResolvedValue(data)};
 render(<Panel/>);expect(await screen.findByRole('alert')).toHaveProperty('textContent','ERP indisponível');
 expect(screen.queryByRole('article')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Atualizar'}));
 await waitFor(()=>expect(screen.getByRole('article',{name:'Veículo ABC1234'})).toBeTruthy());
});
it('atualização manual preserva os cartões se a consulta falhar',async()=>{
 window.RB_API={getFleetRevenue:vi.fn().mockResolvedValueOnce(data).mockRejectedValueOnce(new Error('Sem conexão'))};
 render(<Panel/>);
 await screen.findByRole('article',{name:'Veículo ABC1234'});
 fireEvent.click(screen.getByRole('button',{name:'Atualizar'}));
 expect(await screen.findByRole('alert')).toHaveProperty('textContent',expect.stringContaining('última consulta'));
 expect(screen.getByRole('article',{name:'Veículo ABC1234'})).toBeTruthy();
});
it('separa progresso mensal do ritmo proporcional e limita a barra em 100%',()=>{
 render(<RevenueCard item={{...item,actual:36000,remaining:0}} period={data.period} onDetails={()=>{}}/>);
 const progress=screen.getByRole('progressbar');
 expect(progress.getAttribute('aria-valuenow')).toBe('100');
 expect(progress.getAttribute('aria-valuetext')).toBe('120.0% da meta mensal');
 expect(screen.getByText('Meta mensal atingida')).toBeTruthy();
});
it('sem meta informa histórico insuficiente e não apresenta diferença positiva',()=>{
 render(<RevenueCard item={{...item,target:null,expected:null,gap:null,pace:null,provisional:true,status:'sem_base'}} period={data.period} onDetails={()=>{}}/>);
 expect(screen.getByText('Histórico insuficiente para definir a meta')).toBeTruthy();
 expect(screen.getByText('Comparação indisponível')).toBeTruthy();
 expect(screen.queryByRole('progressbar')).toBeNull();
});
it('modo TV adapta paginação e funciona mesmo sem suporte a tela cheia',async()=>{
 const width=window.innerWidth,height=window.innerHeight;
 Object.defineProperty(window,'innerWidth',{configurable:true,value:1920});Object.defineProperty(window,'innerHeight',{configurable:true,value:1080});
 const fleet=Array.from({length:10},(_,index)=>({...item,plate:`ABC${index}`}));
 window.RB_API={getFleetRevenue:vi.fn().mockResolvedValue({...data,items:fleet})};
 try {
  render(<Panel/>);await screen.findByRole('article',{name:'Veículo ABC0'});
  fireEvent.click(screen.getByRole('button',{name:/Iniciar na TV/}));
  expect(screen.getAllByRole('article')).toHaveLength(6);
  expect(screen.getByText(/Rotação automática/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Próxima página'}));
  expect(screen.getAllByRole('article')).toHaveLength(4);
  fireEvent.click(screen.getByRole('button',{name:'Sair da TV'}));
  expect(screen.getByRole('button',{name:/Iniciar na TV/})).toBeTruthy();
 } finally {Object.defineProperty(window,'innerWidth',{configurable:true,value:width});Object.defineProperty(window,'innerHeight',{configurable:true,value:height});}
});
