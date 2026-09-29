import { backend } from '../services/backend';

export default function ModulePage({ title, description }) {
  return (
    <section className="module-page">
      <div className="page-heading">
        <div>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
      </div>
      <div className="structure-card">
        <strong>Estrutura criada</strong>
        <p>O módulo já está reservado na arquitetura do SIGFROTA. Nenhum dado fictício foi inserido nesta fase.</p>
        <small>Backend: {backend.configured ? backend.provider : 'Firebase será conectado posteriormente.'}</small>
      </div>
    </section>
  );
}
