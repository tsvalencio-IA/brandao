import { jsPDF } from 'jspdf';

const text=(value,fallback='-')=>{
  const v=value===undefined||value===null?'':String(value).trim();
  return v||fallback;
};

const dateBR=(value)=>{
  if(!value)return '-';
  const d=new Date(value);
  return Number.isNaN(d.getTime())?String(value):d.toLocaleString('pt-BR');
};

const imageAttachment=(item)=>String(item?.type||'').startsWith('image/')||/\.(png|jpe?g|webp)$/i.test(String(item?.url||''));

const toDataUrl=async(url)=>{
  const response=await fetch(url,{mode:'cors'});
  if(!response.ok)throw new Error('Não foi possível carregar uma imagem do checklist.');
  const blob=await response.blob();
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=()=>reject(reader.error);
    reader.readAsDataURL(blob);
  });
};

export async function buildWorkshopRequestPdf({vehicle,down,diagnosis,checklist,order,user}){
  const doc=new jsPDF({unit:'mm',format:'a4',compress:true});
  const margin=14;
  const width=182;
  let y=14;

  const ensure=(needed=12)=>{
    if(y+needed>282){doc.addPage();y=14;}
  };

  const heading=(label)=>{
    ensure(12);
    doc.setFillColor(15,31,56);
    doc.rect(margin,y,width,8,'F');
    doc.setTextColor(255,255,255);
    doc.setFont('helvetica','bold');
    doc.setFontSize(10);
    doc.text(label,margin+3,y+5.4);
    doc.setTextColor(15,31,56);
    y+=11;
  };

  const row=(label,value)=>{
    ensure(10);
    doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.setTextColor(83,98,116);
    doc.text(label,margin,y);
    doc.setFont('helvetica','normal');doc.setTextColor(15,31,56);
    const lines=doc.splitTextToSize(text(value),132);
    doc.text(lines,margin+43,y);
    y+=Math.max(6,lines.length*4.4);
  };

  doc.setTextColor(15,31,56);
  doc.setFont('helvetica','bold');
  doc.setFontSize(17);
  doc.text('FROTAS PM',margin,y);
  doc.setFontSize(13);
  doc.text('SOLICITAÇÃO DE ORÇAMENTO / ENCAMINHAMENTO À OFICINA',margin,y+7);
  doc.setFont('helvetica','normal');
  doc.setFontSize(8.5);
  doc.setTextColor(83,98,116);
  doc.text('Documento gerado pelo SIGFROTA para acompanhamento institucional da manutenção.',margin,y+13);
  y+=22;

  heading('IDENTIFICAÇÃO DA VIATURA');
  row('Prefixo / patrimônio',text(vehicle?.prefix)+' / '+text(vehicle?.patrimonio));
  row('Placa',vehicle?.plate);
  row('Veículo',[vehicle?.brand,vehicle?.model,vehicle?.year].filter(Boolean).join(' '));
  row('Chassi',vehicle?.chassis);
  row('OPM / Unidade',vehicle?.unit);
  row('Responsável',vehicle?.responsible_name||user?.nome_guerra||user?.displayName||user?.name||user?.email);
  row('KM / Horímetro',Number(checklist?.km||down?.km||vehicle?.km_horimeter||0).toLocaleString('pt-BR'));
  row('Prioridade',order?.priority||diagnosis?.priority||down?.priority||'media');

  heading('SOLICITAÇÃO / DIAGNÓSTICO');
  row('Problema relatado',down?.defect_description);
  row('Categoria',down?.defect_category);
  row('Diagnóstico técnico',diagnosis?.technical_diagnosis);
  row('Causa provável',diagnosis?.probable_cause);
  row('Serviços solicitados',order?.services_requested);
  row('Observações',order?.observations||checklist?.observations||down?.observations);

  heading('CHECKLIST DE ENCAMINHAMENTO');
  const entries=Object.entries(checklist?.items||{});
  if(!entries.length){
    row('Checklist','Nenhum item informado.');
  }else{
    doc.setFontSize(8);
    for(const [section,item] of entries){
      ensure(9);
      const status=text(item?.status,'-');
      const observation=text(item?.observation,'');
      doc.setFont('helvetica','bold');doc.setTextColor(15,31,56);
      doc.text(section,margin,y);
      doc.setFont('helvetica','normal');
      doc.text(status,margin+55,y);
      const lines=doc.splitTextToSize(observation||'-',93);
      doc.text(lines,margin+82,y);
      doc.setDrawColor(220,225,232);
      doc.line(margin,y+2,width+margin,y+2);
      y+=Math.max(6,lines.length*4);
    }
  }

  const media=[
    ...(Array.isArray(down?.attachments)?down.attachments:[]),
    ...(Array.isArray(checklist?.photos)?checklist.photos:[])
  ].filter(imageAttachment);

  if(media.length){
    heading('EVIDÊNCIAS FOTOGRÁFICAS');
    let col=0;
    for(let i=0;i<media.length;i++){
      if(col===0)ensure(63);
      try{
        const data=await toDataUrl(media[i].url);
        const x=margin+(col*92);
        doc.setDrawColor(205,213,223);
        doc.rect(x,y,87,55);
        doc.addImage(data,'JPEG',x+1,y+1,85,48,undefined,'FAST');
        doc.setFontSize(7);doc.setTextColor(83,98,116);
        doc.text(text(media[i].name||media[i].original_filename,'Foto '+(i+1)),x+2,y+53,{maxWidth:82});
      }catch{
        const x=margin+(col*92);
        doc.setFontSize(8);doc.setTextColor(160,50,50);
        doc.text('Imagem indisponível no momento da geração.',x,y+8,{maxWidth:84});
      }
      col++;
      if(col===2){col=0;y+=61;}
    }
    if(col!==0)y+=61;
  }

  ensure(22);
  doc.setDrawColor(15,31,56);
  doc.line(margin,y,width+margin,y);
  y+=6;
  doc.setFontSize(8);doc.setTextColor(83,98,116);
  doc.text('O.S./OES: '+text(order?.oes_number),margin,y);
  doc.text('Gerado em: '+new Date().toLocaleString('pt-BR'),margin,y+5);
  doc.text('Gerado por: '+text(user?.nome_guerra||user?.displayName||user?.name||user?.email),margin,y+10);
  doc.text('Powered by thIAguinho Soluções Digitais',margin,y+15);

  const filename='SOLICITACAO_'+text(vehicle?.plate||vehicle?.prefix,'VIATURA').replace(/[^A-Z0-9_-]/gi,'_')+'.pdf';
  return {blob:doc.output('blob'),filename};
}

export function downloadPdfBlob(blob,filename){
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}
