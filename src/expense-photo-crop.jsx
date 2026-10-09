import React, {useEffect,useRef,useState} from 'react';
import {photoCanvas} from './expense-photo-image.js';

export default function ExpensePhotoCrop({source,kind,onRead,onClose}) {
  const [angle,setAngle]=useState(0),[preview,setPreview]=useState(''),[crop,setCrop]=useState(null);
  const [target,setTarget]=useState(kind==='odometer' ? 'odometer' : kind==='pump' ? 'fuelAmount' : '');
  const [error,setError]=useState('');
  const start=useRef(null);
  useEffect(()=>{let active=true;setPreview('');setCrop(null);photoCanvas(source,angle).then(canvas=>{if(active)setPreview(canvas.toDataURL());}).catch(()=>{if(active)setError('Não foi possível preparar esta foto. Tente anexá-la novamente.');});return()=>{active=false;};},[source,angle]);
  function point(e){const box=e.currentTarget.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(e.clientX-box.left)/box.width)),y:Math.max(0,Math.min(1,(e.clientY-box.top)/box.height))};}
  return <div className="expense-crop">
    <strong>Ajustar área de leitura</strong>
    <p>Endireite a foto e arraste sobre a área desejada. Para o visor, selecione apenas um número completo, incluindo a vírgula ou ponto.</p>
    <label>Inclinação: {angle}°<input aria-label="Inclinação da foto" type="range" min="-30" max="30" value={angle} onChange={e=>setAngle(Number(e.target.value))}/></label>
    {kind!=='invoice' && <label>O que ler?<select value={target} onChange={e=>setTarget(e.target.value)} aria-label="Campo da área selecionada">{kind==='odometer' ? <option value="odometer">Quilometragem</option> : <><option value="fuelAmount">Valor do combustível</option><option value="liters">Litros</option></>}</select></label>}
    {error && <p role="alert">{error}</p>}
    {preview && <div className="expense-crop-image" onPointerDown={e=>{e.preventDefault();start.current=point(e);setCrop(null);e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(!start.current)return;const end=point(e),begin=start.current;setCrop({x:Math.min(begin.x,end.x),y:Math.min(begin.y,end.y),width:Math.abs(end.x-begin.x),height:Math.abs(end.y-begin.y)});}} onPointerUp={()=>{start.current=null;}} onPointerCancel={()=>{start.current=null;}}>
      <img draggable="false" src={preview} alt="Arraste para selecionar a área que será lida"/>
      {crop && <span style={{left:`${crop.x*100}%`,top:`${crop.y*100}%`,width:`${crop.width*100}%`,height:`${crop.height*100}%`}}/>}
    </div>}
    <div className="expense-photo-actions"><button type="button" disabled={!preview || (target && (!crop || crop.width<.02 || crop.height<.01))} onClick={()=>onRead({angle,crop:crop?.width>.02 && crop?.height>.01 ? crop : undefined,target})}>Ler área selecionada</button><button type="button" onClick={()=>setCrop(null)}>Limpar seleção</button><button type="button" onClick={onClose}>Voltar</button></div>
  </div>;
}
