'use client'

import { getProductCategorySalesByYear } from '@/app/api/stats'
import type { ProductCategorySalesByYear } from '@/lib/types/stats'
import { reportOptions } from '@/app/reports/report-options'
import { ReportView } from '@/app/reports/report-view'
import type { ReportColumn, ReportRequest } from '@/app/reports/report-view'

const initialFilters: Record<string, never> = {}

const columns: ReportColumn<ProductCategorySalesByYear>[] = [
  { key: 'Año', label: 'Año', format: 'year', primary: true },
  { key: 'Novelty Items', label: 'Novelty Items', format: 'amount' },
  { key: 'Clothing', label: 'Clothing', format: 'amount' },
  { key: 'Mugs', label: 'Mugs', format: 'amount' },
  { key: 'T-Shirts', label: 'T-Shirts', format: 'amount' },
  { key: 'Airline Novelties', label: 'Airline Novelties', format: 'amount' },
  { key: 'Computing Novelties', label: 'Computing Novelties', format: 'amount' },
  { key: 'USB Novelties', label: 'USB Novelties', format: 'amount' },
  { key: 'Furry Footwear', label: 'Furry Footwear', format: 'amount' },
  { key: 'Toys', label: 'Toys', format: 'amount' },
  { key: 'Packaging Materials', label: 'Packaging Materials', format: 'amount' },
]

/** Consulta la matriz de ventas por grupo de productos y año de la sucursal indicada. */
async function loadMatrix(filters: Record<string, never>, { sucursal }: ReportRequest) {
  return getProductCategorySalesByYear(sucursal)
}

/** Página del reporte de ventas por categoría de producto y año. */
export default function ProductCategorySalesByYearPage() {
  const report = reportOptions['product-category-sales-by-year']

  return (
    <ReportView
      title={report.title}
      description={report.description}
      columns={columns}
      initialFilters={initialFilters}
      loadData={loadMatrix}
    />
  )
}
