import {Navigate, Route, Routes} from 'react-router-dom';
import salesRoute from './sales.route';
import invoiceRoute from './invoice.route';

export default function AppRoutes() {
  return <Routes>
    {salesRoute}
    {invoiceRoute}
    <Route path="*" element={<Navigate to="/sales" replace/>}/>
  </Routes>;
}
