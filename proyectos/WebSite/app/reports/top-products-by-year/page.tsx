'use client'

import { getTopProductsByYear } from '@/app/api/stats'
import type { TopProductByYear, YearFilters } from '@/lib/types/stats'
import { YearReportFilters } from '@/app/reports/report-filters'
import { reportOptions } from '@/app/reports/report-options'
import { ReportView } from '@/app/reports/report-view'
import type { ReportColumn, ReportRequest } from '@/app/reports/report-view'

const initialFilters: YearFilters = { year: null }

const columns: ReportColumn<TopProductByYear>[] = [
  { key: 'Año', label: 'Año', format: 'year' },
  { key: 'Ranking', label: 'Puesto', format: 'count' },
  { key: 'NombreProducto', label: 'Producto', primary: true },
  { key: 'Ganancia', label: 'Ganancia acumulada', format: 'amount' },
]

/** Consulta el ranking de productos del año indicado. */
async function loadRanking(filters: YearFilters, { sucursal }: ReportRequest) {
  return getTopProductsByYear(filters.year, sucursal)
}

/** Página del reporte de productos con mayor ganancia por año. */
export default function TopProductsByYearPage() {
  const report = reportOptions['top-products-by-year']

  return (
    <ReportView
      title={report.title}
      description={report.description}
      columns={columns}
      initialFilters={initialFilters}
      loadData={loadRanking}
      renderFilters={(filters, setFilters) => <YearReportFilters source="invoices" filters={filters} setFilters={setFilters} />}
    />
  )
}
