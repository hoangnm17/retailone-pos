import {BrowserRouter} from 'react-router-dom';
import {NotificationProvider} from 'components/global/Notification/NotificationContext';
import {PosProvider, usePos} from 'hooks/pos/usePos';
import AppRoutes from './routes/index.route';
import Bill from 'components/pos/Sale/Bill';

function PosRoutes() {
  const {receipt, closeReceipt} = usePos();
  return <>
    <AppRoutes/>
    {receipt && <Bill key={receipt.invoice.id} invoice={receipt.invoice} autoPrint={receipt.autoPrint} onClose={closeReceipt}/>}
  </>;
}

export default function App() {
  return <BrowserRouter><NotificationProvider><PosProvider><PosRoutes/></PosProvider></NotificationProvider></BrowserRouter>;
}
