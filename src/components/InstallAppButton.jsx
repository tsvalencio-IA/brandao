import { Download } from 'lucide-react';

export default function InstallAppButton({ compact = false }) {
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
