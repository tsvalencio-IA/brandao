import * as XLSX from 'xlsx';

const num=(value)=>{
  if(typeof value==='number'&&Number.isFinite(value))return value;
  const raw=String(value??'').replace(/R\$/gi,'').replace(/\s/g,'').replace(/\./g,'').replace(',','.');
  const parsed=Number(raw);
  return Number.isFinite(parsed)?parsed:0;
};

const pickText=(rows,label)=>{
  for(const row of rows){
    for(const cell of row){
      const value=String(cell??'');
      if(value.toUpperCase().includes(label.toUpperCase()))return value;
    }
  }
  return '';
};

const afterColon=(value)=>String(value||'').split(':').slice(1).join(':').trim();

export async function parseBudgetFile(file){
  const name=String(file?.name||'');
  if(/\.pdf$/i.test(name)){
    return {
      source_type:'PDF',
      source_name:name,
      structured:false,
      parts:[],
      services:[],
      parts_value:0,
      labor_value:0,
      total_value:0,
      vehicle_plate:'',
      vehicle_prefix:'',
      message:'PDF será anexado como documento oficial. Para importação automática item a item, envie também a planilha XLSX quando disponível.'
    };
  }

  if(!/\.(xlsx|xls)$/i.test(name))throw new Error('Formato não suportado. Use XLSX, XLS ou PDF.');

  const wb=XLSX.read(await file.arrayBuffer(),{cellDates:false});
  const sheet=wb.Sheets[wb.SheetNames[0]];
  const rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:true});
  let section='';
  const parts=[];
  const services=[];

  for(const row of rows){
    const tag=String(row?.[1]??'').trim();
    const description=String(row?.[3]??'').trim();

    if(/^SEÇÃO\s*:/i.test(tag)){
      section=tag.replace(/^SEÇÃO\s*:/i,'').trim();
      continue;
    }

    if(/^PEÇA/i.test(tag)){
      const code=(tag.match(/C[ÓO]D\.?\s*:\s*([^\s\n]+)/i)||[])[1]||'';
      const quantity=Math.max(1,num(row?.[4]));
      const original=num(row?.[5]);
      const net=num(row?.[7]);
      parts.push({
        section,
        code,
        description,
        quantity,
        unit_value:quantity?original/quantity:original,
        original_value:original,
        discount_value:Math.max(0,original-net),
        net_value:net
      });
      continue;
    }

    if(/^SERVI[ÇC]O/i.test(tag)){
      const code=(tag.match(/COD\.\s*INTERNO\s*:\s*([^\s\n]+)/i)||[])[1]||'';
      const siafisico=(tag.match(/COD\.\s*SIAFISICO\s*:\s*([^\s\n]+)/i)||[])[1]||'';
      const hours=num(row?.[4]);
      const original=num(row?.[5]);
      const net=num(row?.[7]);
      services.push({
        section,
        code,
        siafisico,
        description,
        hours,
        original_value:original,
        discount_value:Math.max(0,original-net),
        net_value:net
      });
    }
  }

  const head=rows.slice(0,18);
  const plateCell=pickText(head,'PLACA:');
  const prefixCell=pickText(head,'PREFIXO:');
  const kmCell=pickText(head,'KM:');
  const unitCell=pickText(head,'OPM DETENTORA:');
  const referenceCell=pickText(head,'REFERENCIA:');

  const partsValue=parts.reduce((sum,x)=>sum+Number(x.net_value||0),0);
  const laborValue=services.reduce((sum,x)=>sum+Number(x.net_value||0),0);

  return {
    source_type:'XLSX',
    source_name:name,
    structured:true,
    sheet_name:wb.SheetNames[0],
    vehicle_plate:afterColon(plateCell),
    vehicle_prefix:afterColon(prefixCell),
    km:num(afterColon(kmCell)),
    unit:afterColon(unitCell),
    reference:afterColon(referenceCell),
    parts,
    services,
    parts_value:Number(partsValue.toFixed(2)),
    labor_value:Number(laborValue.toFixed(2)),
    total_value:Number((partsValue+laborValue).toFixed(2)),
    message:parts.length||services.length
      ? parts.length+' peça(s) e '+services.length+' serviço(s) identificados.'
      :'Nenhum item estruturado foi localizado na planilha.'
  };
}
