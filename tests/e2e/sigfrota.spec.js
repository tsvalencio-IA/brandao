import { test, expect } from '@playwright/test';

const ISO='2026-10-02T12:00:00.000Z';
const unit='52.º BPM/I - 2.ª CIA';

const vehicle=(id,prefix,status,km=100)=>({
  id,prefix,plate:'AAA'+id.toUpperCase().padEnd(4,'A').slice(0,4),brand:'GM',model:'SPIN',year:2023,
  unit,status,ativo:true,deleted:false,km_horimeter:km,created_at:ISO,updated_at:ISO
});

const seed={
  vehicles:[
    vehicle('v1','I-52100','OPERANDO',123),
    vehicle('v2','I-52200','AGUARDANDO_DIAGNOSTICO',200),
    vehicle('v3','I-52300','AGUARDANDO_CHECKLIST',300),
    vehicle('v4','I-52400','CHECKLIST_CONCLUIDO',400),
    vehicle('v5','I-52500','EM_DIAGNOSTICO',500),
  ],
  vehicle_downs:[
    {id:'d2',vehicle_id:'v2',vehicle_prefix:'I-52200',vehicle_plate:'AAAV2AAA',unit,km:200,defect_description:'Ruído dianteiro',status:'ABERTA',created_at:'2026-10-02T12:02:00.000Z',attachments:[]},
    {id:'d3',vehicle_id:'v3',vehicle_prefix:'I-52300',vehicle_plate:'AAAV3AAA',unit,km:300,defect_description:'Freio baixo',status:'DIAGNOSTICADA',diagnosis_id:'diag3',created_at:'2026-10-02T12:03:00.000Z',attachments:[]},
    {id:'d4',vehicle_id:'v4',vehicle_prefix:'I-52400',vehicle_plate:'AAAV4AAA',unit,km:400,defect_description:'Suspensão',status:'CHECKLIST_CONCLUIDO',diagnosis_id:'diag4',checklist_id:'ch4',created_at:'2026-10-02T12:04:00.000Z',attachments:[]},
    {id:'d5',vehicle_id:'v5',vehicle_prefix:'I-52500',vehicle_plate:'AAAV5AAA',unit,km:500,defect_description:'Lâmpada',status:'DIAGNOSTICADA',diagnosis_id:'diag5',created_at:'2026-10-02T12:05:00.000Z',attachments:[]},
  ],
  diagnoses:[
    {id:'diag3',vehicle_id:'v3',vehicle_down_id:'d3',unit,technical_diagnosis:'Substituir fluido',external_workshop:true,status:'CONCLUIDO',created_at:'2026-10-02T12:03:30.000Z'},
    {id:'diag4',vehicle_id:'v4',vehicle_down_id:'d4',unit,technical_diagnosis:'Avaliar suspensão',external_workshop:true,status:'CONCLUIDO',created_at:'2026-10-02T12:04:30.000Z'},
    {id:'diag5',vehicle_id:'v5',vehicle_down_id:'d5',unit,technical_diagnosis:'Trocar lâmpada',external_workshop:false,status:'CONCLUIDO',created_at:'2026-10-02T12:05:30.000Z'},
  ],
  checklists:[
    {id:'ch4',vehicle_id:'v4',vehicle_down_id:'d4',diagnosis_id:'diag4',unit,km:400,status:'CONCLUIDO',items:{Freios:{status:'TROCAR',observation:'Pastilha'}},created_at:'2026-10-02T12:04:45.000Z'},
  ],
  workshops:[
    {id:'w1',name:'Oficina Teste',codigo:'TST',active:true,created_at:ISO},
  ],
  maintenance_orders:[],
  oes_counters:[],
  operational_logs:[],
  public_vehicle_tokens:[
    {id:'token-v1',active:true,vehicle_id:'v1',prefix:'I-52100',plate:'AAAV1AAA',unit},
  ],
  audit_logs:[],
  parts:[],
  stock_movements:[],
  quick_maintenances:[],
  financial_flows:[],
  budgets:[],
  users:[],
  saas2_integrations:[],
  saas2_sync_events:[],
  saas2_chat:[],
};

async function seedLocal(context, role='gestor'){
  await context.addInitScript(({seed,role})=>{
    localStorage.clear();
    localStorage.setItem('sigfrota:setup-role',role);
    Object.entries(seed).forEach(([name,rows])=>{
      localStorage.setItem('sigfrota:data:'+name,JSON.stringify(rows));
    });
  },{seed,role});
}

async function stable(page){
  await page.locator('#root').waitFor({state:'attached'});
  await page.waitForTimeout(250);
}

async function expectNoHorizontalOverflow(page,label='page'){
  const size=await page.evaluate(()=>({
    viewport:window.innerWidth,
    html:document.documentElement.scrollWidth,
    body:document.body.scrollWidth,
  }));
  expect(Math.max(size.html,size.body),label+' overflow horizontal').toBeLessThanOrEqual(size.viewport+2);
}

function nextFlowButton(page,name){
  return page.locator('.flow-next-action').getByRole('button',{name});
}

test.describe('SIGFROTA sem Firebase real',()=>{
  test.beforeAll(async({browser})=>{
    const context=await browser.newContext();
    try{
      await seedLocal(context);
      const page=await context.newPage();
      await page.goto('/app.html#/');
      await stable(page);
      if(await page.getByRole('button',{name:'Entrar'}).count()){
        throw new Error('AMBIENTE E2E INVÁLIDO: a tela de login apareceu. VITE_SETUP_MODE=true não chegou ao Vite; os fluxos locais não serão executados.');
      }
      await expect(page.getByText('Modo de configuração ativo')).toBeVisible();
    }finally{
      await context.close();
    }
  });

  test.beforeEach(async({context})=>{ await seedLocal(context); });

  test('ambiente isolado está ativo e não usa tela de login',async({page})=>{
    await page.goto('/app.html#/');
    await stable(page);
    await expect(page.getByText('Modo de configuração ativo')).toBeVisible();
    await expect(page.getByRole('button',{name:'Entrar'})).toHaveCount(0);
  });

  test('fluxo completo Baixa -> Diagnóstico -> Checklist -> O.S.',async({page})=>{
    await page.goto('/app.html#/viaturas/v1');
    await stable(page);
    await expect(page.getByRole('heading',{name:'I-52100'})).toBeVisible();
    await nextFlowButton(page,/Registrar Baixa/i).click();

    await page.getByLabel('KM / Horímetro').fill('123');
    await page.getByLabel('Categoria').selectOption({label:'Motor'});
    await page.getByLabel('Descrição do defeito').fill('Falha em teste local');
    await page.getByRole('button',{name:'Registrar Baixa'}).click();
    await expect(page).toHaveURL(/app\.html#\/viaturas\/v1$/);
    await expect(page.getByText('Baixas e fotos')).toBeVisible();
    await expect(nextFlowButton(page,'Fazer Diagnóstico')).toBeVisible();

    await nextFlowButton(page,'Fazer Diagnóstico').click();
    await expect(page.getByRole('heading',{name:'Diagnóstico Técnico'})).toBeVisible();
    await page.getByLabel('Diagnóstico técnico').fill('Diagnóstico de teste local');
    await page.getByRole('button',{name:'Concluir e avançar'}).click();
    await expect(page).toHaveURL(/app\.html#\/viaturas\/v1$/);
    await expect(nextFlowButton(page,'Fazer Checklist')).toBeVisible();

    await nextFlowButton(page,'Fazer Checklist').click();
    await expect(page.getByRole('heading',{name:/Checklist • I-52100/})).toBeVisible();
    await page.getByRole('button',{name:'Concluir checklist'}).click();
    await expect(page).toHaveURL(/app\.html#\/viaturas\/v1$/);
    await expect(nextFlowButton(page,'Gerar O.S.')).toBeVisible();

    await nextFlowButton(page,'Gerar O.S.').click();
    await expect(page.getByRole('heading',{name:'Gerar OES'})).toBeVisible();
    await page.getByLabel('Oficina').selectOption('w1');
    await page.getByRole('dialog').getByRole('button',{name:'Gerar OES'}).click();
    await expect(page).toHaveURL(/app\.html#\/viaturas\/v1$/);
    await expect(nextFlowButton(page,/Abrir O\.S\. atual/)).toBeVisible();
    await expectNoHorizontalOverflow(page,'fluxo final');
  });

  test('Cancelar Diagnóstico volta à viatura e não reabre',async({page})=>{
    await page.goto('/app.html#/diagnostico?vehicle=v2');
    await stable(page);
    await expect(page.getByRole('heading',{name:'Diagnóstico Técnico'})).toBeVisible();
    await page.getByRole('button',{name:'Cancelar'}).click();
    await expect(page).toHaveURL(/app\.html#\/viaturas\/v2$/);
    await expect(page.getByRole('heading',{name:'Diagnóstico Técnico'})).toHaveCount(0);
  });

  test('Cancelar Checklist volta à viatura e não reabre',async({page})=>{
    await page.goto('/app.html#/checklist?vehicle=v3');
    await stable(page);
    await expect(page.getByRole('heading',{name:/Checklist • I-52300/})).toBeVisible();
    await page.getByRole('button',{name:'Cancelar'}).click();
    await expect(page).toHaveURL(/app\.html#\/viaturas\/v3$/);
    await expect(page.getByRole('heading',{name:/Checklist •/})).toHaveCount(0);
  });

  test('Cancelar geração de O.S. volta à viatura e não reabre',async({page})=>{
    await page.goto('/app.html#/ordens?vehicle=v4');
    await stable(page);
    await expect(page.getByRole('heading',{name:'Gerar OES'})).toBeVisible();
    await page.getByRole('button',{name:'Cancelar'}).click();
    await expect(page).toHaveURL(/app\.html#\/viaturas\/v4$/);
    await expect(page.getByRole('heading',{name:'Gerar OES'})).toHaveCount(0);
  });

  test('Cancelar Manutenção Rápida volta à viatura e não reabre',async({page})=>{
    await page.goto('/app.html#/manutencao-rapida?vehicle=v5');
    await stable(page);
    await expect(page.getByRole('heading',{name:'Manutenção Rápida'}).last()).toBeVisible();
    await page.getByRole('button',{name:'Cancelar'}).click();
    await expect(page).toHaveURL(/app\.html#\/viaturas\/v5$/);
  });

  test('QR do patrulheiro não exige KM final e libera campos por necessidade',async({page})=>{
    await page.goto('/app.html#/patrulha/token-v1');
    await stable(page);
    await expect(page.getByText('I-52100')).toBeVisible();
    await expect(page.getByText(/KM final/i)).toHaveCount(0);
    await expect(page.getByLabel('KM atual / inicial')).toBeVisible();
    await page.getByText('Abastecimento',{exact:true}).click();
    await expect(page.getByLabel('KM do abastecimento')).toBeVisible();
    await expectNoHorizontalOverflow(page,'QR patrulheiro');
  });

  const routes=[
    '/', '/viaturas', '/registrar-baixa', '/diagnostico', '/checklist',
    '/ordens', '/aprovacoes', '/oficinas', '/manutencao-rapida',
    '/portal-oficina', '/estoque', '/controle-operacional',
    '/uge', '/relatorios-uge', '/usuarios', '/auditoria'
  ];

  for(const route of routes){
    test('responsividade sem scroll lateral: '+route,async({page})=>{
      await page.goto('/app.html#'+route);
      await stable(page);
      await expectNoHorizontalOverflow(page,route);
    });
  }

  test('menus essenciais por perfil',async({page,context})=>{
    const expectations={
      gestor:['Dashboard','Viaturas','Usuários','Auditoria'],
      adm:['Dashboard','Viaturas','Aprovações','Fluxo UGE'],
      adm_opm:['Dashboard','Viaturas','Registrar Baixa','Controle Operacional'],
      mecanico:['Dashboard','Diagnóstico','Checklist','Manutenção Rápida'],
      oficina:['Dashboard','Ordens de Manutenção','Portal da Oficina'],
      uge:['Dashboard','Fluxo UGE','Relatórios UGE'],
    };
    for(const [role,labels] of Object.entries(expectations)){
      await context.clearCookies();
      await page.goto('/app.html#/');
      await page.evaluate((role)=>localStorage.setItem('sigfrota:setup-role',role),role);
      await page.reload();
      await stable(page);
      for(const label of labels){
        await expect(page.getByText(label,{exact:true}).first(),role+' deve ver '+label).toBeVisible();
      }
    }
  });
});
