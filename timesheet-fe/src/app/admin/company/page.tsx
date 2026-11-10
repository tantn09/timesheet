import AdminShell from '../AdminShell';
import CompanyInfo from '../customers/CustomersAdmin';
export default function CompanyPage() { return <AdminShell requiredPermission="customers:manage"><CompanyInfo /></AdminShell>; }
