'use client'

import { getSupplierPurchaseSummary } from '@/app/api/stats'
import type { SupplierPurchaseSummary, SupplierPurchaseSummaryFilters } from '@/lib/types/stats'
import { SummaryReportFilters } from '@/app/reports/report-filters'
import { reportOptions } from '@/app/reports/report-options'
import { ReportView } from '@/app/reports/report-view'
import type { ReportColumn } from '@/app/reports/report-view'

const initialFilters: SupplierPurchaseSummaryFilters = { supplierName: '', supplierCategoryName: '' }

const columns: ReportColumn<SupplierPurchaseSummary>[] = [
  { key: 'NombreProveedor', label: 'Proveedor', primary: true },
  { key: 'NombreCategoriaProveedor', label: 'Categoría' },
  { key: 'MontoMaximo', label: 'Monto máximo', format: 'amount' },
  { key: 'MontoMinimo', label: 'Monto mínimo', format: 'amount' },
  { key: 'MontoPromedio', label: 'Monto promedio', format: 'amount' },
]

async function loadSummary(filters: SupplierPurchaseSummaryFilters) {
  return getSupplierPurchaseSummary(filters.supplierName, filters.supplierCategoryName)
}

export default function SupplierPurchaseSummaryPage() {
  const report = reportOptions['supplier-purchase-summary']

  return (
    <ReportView
      title={report.title}
      description={report.description}
      columns={columns}
      initialFilters={initialFilters}
      loadData={loadSummary}
      isSummary={(row) => row.NombreProveedor === 'Resumen' && !row.NombreCategoriaProveedor.trim()}
      renderFilters={(filters, setFilters) => (
        <SummaryReportFilters
          entity="supplier"
          name={filters.supplierName}
          categoryName={filters.supplierCategoryName}
          onNameChange={(value) => setFilters((previous) => ({ ...previous, supplierName: value }))}
          onCategoryChange={(value) => setFilters((previous) => ({ ...previous, supplierCategoryName: value }))}
        />
      )}
    />
  )
}
