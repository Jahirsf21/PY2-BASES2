'use client'

import { getSupplierPurchaseTracking } from '@/app/api/stats'
import type { MonthlyTrackingFilters, SupplierPurchaseTracking } from '@/lib/types/stats'
import { MonthlyTrackingReportFilters } from '@/app/reports/report-filters'
import { reportOptions } from '@/app/reports/report-options'
import { ReportView } from '@/app/reports/report-view'
import type { ReportColumn } from '@/app/reports/report-view'

const initialFilters: MonthlyTrackingFilters = { year: null, month: null, stockGroupIDs: [] }

const columns: ReportColumn<SupplierPurchaseTracking>[] = [
  { key: 'NombreProveedor', label: 'Proveedor', primary: true },
  { key: 'Año', label: 'Año', format: 'year' },
  { key: 'Mes', label: 'Mes', format: 'month' },
  { key: 'Categorias', label: 'Categorías' },
  { key: 'MontoPrimeraCompra', label: 'Primera compra', format: 'amount' },
  { key: 'MontoUltimaCompra', label: 'Última compra', format: 'amount' },
  { key: 'CantidadTotalMes', label: 'Cantidad total del mes', format: 'count' },
  { key: 'CantidadMaxima', label: 'Cantidad máxima', format: 'count' },
  { key: 'CantidadMinima', label: 'Cantidad mínima', format: 'count' },
]

function loadTracking(filters: MonthlyTrackingFilters, pageNumber: number, pageSize: number) {
  return getSupplierPurchaseTracking(filters.year, filters.month, filters.stockGroupIDs, pageNumber, pageSize)
}

export default function SupplierPurchaseTrackingPage() {
  const report = reportOptions['supplier-purchase-tracking']

  return (
    <ReportView
      title={report.title}
      description={report.description}
      columns={columns}
      initialFilters={initialFilters}
      loadData={loadTracking}
      paginated
      renderFilters={(filters, setFilters) => <MonthlyTrackingReportFilters source="purchases" filters={filters} setFilters={setFilters} />}
    />
  )
}
