'use client'

import { getTopCustomersByYear } from '@/app/api/stats'
import type { TopCustomerByYear, YearRangeFilters } from '@/lib/types/stats'
import { YearRangeReportFilters } from '@/app/reports/report-filters'
import { reportOptions } from '@/app/reports/report-options'
import { ReportView } from '@/app/reports/report-view'
import type { ReportColumn } from '@/app/reports/report-view'

const initialFilters: YearRangeFilters = { yearFrom: null, yearTo: null }

const columns: ReportColumn<TopCustomerByYear>[] = [
  { key: 'Año', label: 'Año', format: 'year' },
  { key: 'Ranking', label: 'Puesto', format: 'count' },
  { key: 'NombreCliente', label: 'Cliente', primary: true },
  { key: 'CantidadFacturas', label: 'Cantidad de facturas', format: 'count' },
  { key: 'MontoFacturado', label: 'Monto facturado', format: 'amount' },
]

/** Consulta el ranking de clientes en el rango de años indicado. */
async function loadRanking(filters: YearRangeFilters) {
  return getTopCustomersByYear(filters.yearFrom, filters.yearTo)
}

/** Página del reporte de mejores clientes por año. */
export default function TopCustomersByYearPage() {
  const report = reportOptions['top-customers-by-year']

  return (
    <ReportView
      title={report.title}
      description={report.description}
      columns={columns}
      initialFilters={initialFilters}
      loadData={loadRanking}
      renderFilters={(filters, setFilters) => <YearRangeReportFilters source="invoices" filters={filters} setFilters={setFilters} />}
    />
  )
}
