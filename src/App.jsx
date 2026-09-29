import { HashRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ModulePage from './pages/ModulePage';

const P = ({ title, description }) => <ModulePage title={title} description={description} />;

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/viaturas" element={<P title="Viaturas" description="Cadastro, consulta, situação e ficha técnica da frota." />} />
          <Route path="/viaturas/:id" element={<P title="Detalhe da Viatura" />} />
          <Route path="/registrar-baixa" element={<P title="Registrar Baixa" description="Abertura de manutenção e registro inicial do defeito." />} />
          <Route path="/ordens" element={<P title="Ordens de Manutenção" />} />
          <Route path="/ordens/:id" element={<P title="Detalhe da Ordem" />} />
          <Route path="/checklist/:orderId" element={<P title="Checklist Técnico" />} />
          <Route path="/oficinas" element={<P title="Oficinas Credenciadas" />} />
          <Route path="/aprovacoes" element={<P title="Aprovações" />} />
          <Route path="/historico" element={<P title="Histórico" />} />
          <Route path="/auditoria" element={<P title="Auditoria" />} />
          <Route path="/usuarios" element={<P title="Usuários" />} />
          <Route path="/portal-oficina" element={<P title="Portal da Oficina" />} />
          <Route path="/controle-operacional" element={<P title="Controle Operacional" />} />
          <Route path="/manutencao-rapida" element={<P title="Manutenção Rápida" />} />
          <Route path="/estoque" element={<P title="Estoque de Peças" />} />
          <Route path="/relatorios-uge" element={<P title="Relatórios UGE" />} />
          <Route path="/uge" element={<P title="Financeiro UGE" />} />
          <Route path="*" element={<P title="Página não encontrada" />} />
        </Route>
        <Route path="/patrol/:vehicleId" element={<P title="Controle Operacional Público" description="Rota reservada para acesso por QR Code." />} />
      </Routes>
    </HashRouter>
  );
}
