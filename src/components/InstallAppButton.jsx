import { Download } from 'lucide-react';

function isInstalledApp() {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const nativeApp = ua.includes('SIGFROTA-APP');
  const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches === true;
  const iosStandalone = window.navigator.standalone === true;
  return nativeApp || standalone || iosStandalone;
}

export default function InstallAppButton({ compact = false }) {
  if (isInstalledApp()) return null;

  const base = window.location.href.split('#')[0];
  const apkUrl = new URL('SIGFROTA-TESTE.apk', base).href;

  return (
    <a
      className={'install-app-button ' + (compact ? 'compact' : '')}
      href={apkUrl}
      download="SIGFROTA-TESTE.apk"
      title="Baixar e instalar o aplicativo SIGFROTA"
    >
      <Download size={17}/>
      <span>Instalar App</span>
    </a>
  );
}
