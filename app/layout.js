
import 'bootstrap/dist/css/bootstrap.min.css';
import './style.css';
import RequestFlowClient from '@/src/components/RequestFlowClient';

export const metadata = {
  title: 'Bizfire Component Editor POC',
  description: 'Schema-driven component editor with live preview'
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>
    <RequestFlowClient />{children}</body></html>;
}
