'use client'

import { getTopSuppliersByYear } from '@/app/api/stats'
import type { TopSupplierByYear, YearRangeFilters } from '@/lib/types/stats'
import { YearRangeReportFilters } from '@/app/reports/report-filters'
import { reportOptions } from '@/app/reports/report-options'
import { ReportView } from '@/app/reports/report-view'
import type { ReportColumn } from '@/app/reports/report-view'

const initialFilters: YearRangeFilters = { yearFrom: null, yearTo: null }

const columns: ReportColumn<TopSupplierByYear>[] = [
  { key: 'Año', label: 'Año', format: 'year' },
  { key: 'Ranking', label: 'Puesto', format: 'count' },
  { key: 'NombreProveedor', label: 'Proveedor', primary: true },
  { key: 'CantidadCompras', label: 'Cantidad de compras', format: 'count' },
  { key: 'MontoComprado', label: 'Monto comprado', format: 'amount' },
]

async function loadRanking(filters: YearRangeFilters) {
  return getTopSuppliersByYear(filters.yearFrom, filters.yearTo)
}

export default function TopSuppliersByYearPage() {
  const report = reportOptions['top-suppliers-by-year']

  return (
    <ReportView
      title={report.title}
      description={report.description}
      columns={columns}
      initialFilters={initialFilters}
      loadData={loadRanking}
      renderFilters={(filters, setFilters) => <YearRangeReportFilters source="purchases" filters={filters} setFilters={setFilters} />}
    />
  )
}
