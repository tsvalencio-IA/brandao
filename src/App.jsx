import { HashRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NotAuthorized from './pages/NotAuthorized';
import Vehicles from './pages/Vehicles';
import VehicleDetail from './pages/VehicleDetail';
import RegisterBaixa from './pages/RegisterBaixa';
import Diagnosis from './pages/Diagnosis';
import Checklist from './pages/Checklist';
import MaintenanceOrders from './pages/MaintenanceOrders';
import OrderDetail from './pages/OrderDetail';
import Approvals from './pages/Approvals';
import Workshops from './pages/Workshops';
import WorkshopPortal from './pages/WorkshopPortal';
import QuickMaintenance from './pages/QuickMaintenance';
import Stock from './pages/Stock';
import OperationalControl from './pages/OperationalControl';
import PatrolPublic from './pages/PatrolPublic';
import UGE from './pages/UGE';
import UGEReports from './pages/UGEReports';
import Users from './pages/Users';
import Audit from './pages/Audit';

export default function App() {
  return <HashRouter>
    <Routes>
      <Route path="/login" element={<Login/>}/>
      <Route path="/patrulha/:token" element={<PatrolPublic/>}/>
      <Route path="/acesso-negado" element={<NotAuthorized/>}/>
      <Route path="/sem-perfil" element={<NotAuthorized noProfile/>}/>
      <Route element={<ProtectedRoute/>}>
        <Route element={<Layout/>}>
          <Route path="/" element={<Dashboard/>}/>
          <Route path="/viaturas" element={<Vehicles/>}/>
          <Route path="/viaturas/:id" element={<VehicleDetail/>}/>
          <Route path="/registrar-baixa" element={<RegisterBaixa/>}/>
          <Route path="/diagnostico" element={<Diagnosis/>}/>
          <Route path="/checklist" element={<Checklist/>}/>
          <Route path="/ordens" element={<MaintenanceOrders/>}/>
          <Route path="/ordens/:id" element={<OrderDetail/>}/>
          <Route path="/aprovacoes" element={<Approvals/>}/>
          <Route path="/oficinas" element={<Workshops/>}/>
          <Route path="/portal-oficina" element={<WorkshopPortal/>}/>
          <Route path="/manutencao-rapida" element={<QuickMaintenance/>}/>
          <Route path="/estoque" element={<Stock/>}/>
          <Route path="/controle-operacional" element={<OperationalControl/>}/>
          <Route path="/uge" element={<UGE/>}/>
          <Route path="/relatorios-uge" element={<UGEReports/>}/>
          <Route path="/usuarios" element={<Users/>}/>
          <Route path="/auditoria" element={<Audit/>}/>
        </Route>
      </Route>
      <Route path="*" element={<NotAuthorized/>}/>
    </Routes>
  </HashRouter>;
}
