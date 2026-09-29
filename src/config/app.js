export const APP = {
  name: 'SIGFROTA',
  institutionalName: 'SIGFROTA',
  subtitle: 'Gestão Integrada de Frota',
  footer: 'Powered by Matheus Brandão e thIAguinho Soluções Digitais.',
  setupMode: import.meta.env.VITE_SETUP_MODE !== 'false',
  publicUrl: (import.meta.env.VITE_APP_PUBLIC_URL || '').replace(/\/$/, ''),
};

export const isSetupMode = () => APP.setupMode;
