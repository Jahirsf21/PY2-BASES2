'use client'

import { getCustomerSalesTracking } from '@/app/api/stats'
import type { CustomerSalesTracking, MonthlyTrackingFilters } from '@/lib/types/stats'
import { MonthlyTrackingReportFilters } from '@/app/reports/report-filters'
import { reportOptions } from '@/app/reports/report-options'
import { ReportView } from '@/app/reports/report-view'
import type { ReportColumn } from '@/app/reports/report-view'

const initialFilters: MonthlyTrackingFilters = { year: null, month: null, stockGroupIDs: [] }

const columns: ReportColumn<CustomerSalesTracking>[] = [
  { key: 'NombreCliente', label: 'Cliente', primary: true },
  { key: 'Año', label: 'Año', format: 'year' },
  { key: 'Mes', label: 'Mes', format: 'month' },
  { key: 'Categorias', label: 'Categorías' },
  { key: 'MontoPrimeraFactura', label: 'Primera factura', format: 'amount' },
  { key: 'MontoUltimaFactura', label: 'Última factura', format: 'amount' },
  { key: 'CantidadTotalMes', label: 'Cantidad total del mes', format: 'count' },
  { key: 'CantidadMaxima', label: 'Cantidad máxima', format: 'count' },
  { key: 'CantidadMinima', label: 'Cantidad mínima', format: 'count' },
]

function loadTracking(filters: MonthlyTrackingFilters, pageNumber: number, pageSize: number) {
  return getCustomerSalesTracking(filters.year, filters.month, filters.stockGroupIDs, pageNumber, pageSize)
}

export default function CustomerSalesTrackingPage() {
  const report = reportOptions['customer-sales-tracking']

  return (
    <ReportView
      title={report.title}
      description={report.description}
      columns={columns}
      initialFilters={initialFilters}
      loadData={loadTracking}
      paginated
      renderFilters={(filters, setFilters) => <MonthlyTrackingReportFilters source="invoices" filters={filters} setFilters={setFilters} />}
    />
  )
}
