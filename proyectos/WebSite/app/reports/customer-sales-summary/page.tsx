'use client'

import { getCustomerSalesSummary } from '@/app/api/stats'
import type { CustomerSalesSummary, CustomerSalesSummaryFilters } from '@/lib/types/stats'
import { SummaryReportFilters } from '@/app/reports/report-filters'
import { reportOptions } from '@/app/reports/report-options'
import { ReportView } from '@/app/reports/report-view'
import type { ReportColumn } from '@/app/reports/report-view'

const initialFilters: CustomerSalesSummaryFilters = { customerName: '', customerCategoryName: '' }

const columns: ReportColumn<CustomerSalesSummary>[] = [
  { key: 'NombreCliente', label: 'Cliente', primary: true },
  { key: 'NombreCategoriaCliente', label: 'Categoría' },
  { key: 'MontoMaximo', label: 'Monto máximo', format: 'amount' },
  { key: 'MontoMinimo', label: 'Monto mínimo', format: 'amount' },
  { key: 'MontoPromedio', label: 'Monto promedio', format: 'amount' },
]

function loadSummary(filters: CustomerSalesSummaryFilters, pageNumber: number, pageSize: number) {
  return getCustomerSalesSummary(filters.customerName, filters.customerCategoryName, pageNumber, pageSize)
}

export default function CustomerSalesSummaryPage() {
  const report = reportOptions['customer-sales-summary']

  return (
    <ReportView
      title={report.title}
      description={report.description}
      columns={columns}
      initialFilters={initialFilters}
      loadData={loadSummary}
      paginated
      isSummary={(row) => row.NombreCliente === 'Resumen' && !row.NombreCategoriaCliente.trim()}
      renderFilters={(filters, setFilters) => (
        <SummaryReportFilters
          entity="customer"
          name={filters.customerName}
          categoryName={filters.customerCategoryName}
          onNameChange={(value) => setFilters((previous) => ({ ...previous, customerName: value }))}
          onCategoryChange={(value) => setFilters((previous) => ({ ...previous, customerCategoryName: value }))}
        />
      )}
    />
  )
}
