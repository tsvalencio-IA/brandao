import { readFileSync } from 'node:fs';

const files = Object.fromEntries([
  'app.html',
  'src/components/ui.jsx',
  'src/components/InstallAppButton.jsx',
  'src/components/Layout.jsx',
  'src/config/app.js',
  'src/pages/Diagnosis.jsx',
  'src/pages/Checklist.jsx',
  'src/pages/MaintenanceOrders.jsx',
  'src/pages/QuickMaintenance.jsx',
  'src/pages/PatrolPublic.jsx',
  'src/pages/VehicleDetail.jsx',
  'android/app/src/main/java/br/com/sigfrota/app/MainActivity.java',
  'android/app/src/main/AndroidManifest.xml',
  'src/components/AppNotifications.jsx',
  'src/services/requestPdf.js',
  'src/services/budgetImport.js',
].map((path) => [path, readFileSync(path, 'utf8')]));

const checks = [
  ['HTML sem \\n literal', !files['app.html'].includes('\\n')],
  ['Botão padrão não submete formulário', files['src/components/ui.jsx'].includes("type = 'button'")],
  ['X do modal é type button', files['src/components/ui.jsx'].includes('<button type="button" className="icon-btn"')],
  ['Diagnóstico cancela voltando à viatura', files['src/pages/Diagnosis.jsx'].includes('closeDiagnosis') && files['src/pages/Diagnosis.jsx'].includes("navigate('/viaturas/'+vehicleId,{replace:true})")],
  ['Cancelar diagnóstico é type button', files['src/pages/Diagnosis.jsx'].includes('<Button type="button" variant="secondary" onClick={closeDiagnosis}>Cancelar</Button>')],
  ['Checklist cancela sem reabrir', files['src/pages/Checklist.jsx'].includes('closeChecklist') && files['src/pages/Checklist.jsx'].includes('<Button type="button" variant="secondary" onClick={closeChecklist}>Cancelar</Button>')],
  ['O.S. cancela sem reabrir', files['src/pages/MaintenanceOrders.jsx'].includes('closeOrderModal') && files['src/pages/MaintenanceOrders.jsx'].includes('<Button type="button" variant="secondary" onClick={closeOrderModal}>Cancelar</Button>')],
  ['Manutenção rápida cancela sem reabrir', files['src/pages/QuickMaintenance.jsx'].includes('closeModal') && files['src/pages/QuickMaintenance.jsx'].includes('<Button type="button" variant="secondary" onClick={closeModal}>Cancelar</Button>')],
  ['Fluxo da viatura usa ciclo real', files['src/pages/VehicleDetail.jsx'].includes('currentDiagnosis') && files['src/pages/VehicleDetail.jsx'].includes('currentChecklist') && files['src/pages/VehicleDetail.jsx'].includes('currentOrder')],
  ['Controle QR não exige KM final', !files['src/pages/PatrolPublic.jsx'].includes('km_final')],
  ['Controle QR libera eventos por necessidade', files['src/pages/PatrolPublic.jsx'].includes('fuel_event') && files['src/pages/PatrolPublic.jsx'].includes('oil_change_event')],
  ['APK se identifica para ocultar instalar app', files['android/app/src/main/java/br/com/sigfrota/app/MainActivity.java'].includes('SIGFROTA-APP')],
  ['APK trata insets das barras Android', files['android/app/src/main/java/br/com/sigfrota/app/MainActivity.java'].includes('WindowInsetsCompat.Type.statusBars()') && files['android/app/src/main/java/br/com/sigfrota/app/MainActivity.java'].includes('WindowInsetsCompat.Type.navigationBars()') && files['android/app/src/main/java/br/com/sigfrota/app/MainActivity.java'].includes('WindowInsetsCompat.Type.displayCutout()') && files['android/app/src/main/java/br/com/sigfrota/app/MainActivity.java'].includes('view.setPadding(bars.left, bars.top, bars.right, bars.bottom)')],
  ['APK se chama Frotas PM', files['android/app/src/main/AndroidManifest.xml'].includes('android:label="Frotas PM"')],
  ['APK solicita notificações Android', files['android/app/src/main/AndroidManifest.xml'].includes('POST_NOTIFICATIONS') && files['android/app/src/main/java/br/com/sigfrota/app/MainActivity.java'].includes('NotificationManager.IMPORTANCE_HIGH')],
  ['Notificações acompanham avarias e orçamentos', files['src/components/AppNotifications.jsx'].includes('Nova avaria') && files['src/components/AppNotifications.jsx'].includes('Orçamento recebido')],
  ['PDF institucional usa checklist e evidências', files['src/services/requestPdf.js'].includes('CHECKLIST DE ENCAMINHAMENTO') && files['src/services/requestPdf.js'].includes('EVIDÊNCIAS FOTOGRÁFICAS')],
  ['Importador aceita XLSX e PDF', files['src/services/budgetImport.js'].includes("source_type:'PDF'") && files['src/services/budgetImport.js'].includes("source_type:'XLSX'")],
  ['Botão instalar some no app nativo/standalone', files['src/components/InstallAppButton.jsx'].includes('SIGFROTA-APP') && files['src/components/InstallAppButton.jsx'].includes('(display-mode: standalone)')],
  ['Rodapé institucional correto', files['src/config/app.js'].includes('Powered by Matheus Brandão e thIAguinho Soluções Digitais.')],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) {
  console.log((ok ? 'OK  ' : 'FAIL') + ' ' + name);
}

if (failed.length) {
  console.error('\nFalharam ' + failed.length + ' verificações críticas.');
  process.exit(1);
}
console.log('\nTodas as verificações críticas passaram.');
