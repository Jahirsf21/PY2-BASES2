import Link from 'next/link'
import { ChevronRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { reportOptions } from '@/app/reports/report-options'

const groups = ['Ventas', 'Compras'] as const

export default function ReportsPage() {
  return (
    <main className="flex min-w-0 flex-1 bg-muted/30">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:gap-6 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Estadísticas</h1>
            <p className="text-sm text-muted-foreground">Seleccione un reporte para consultar las estadísticas de ventas y compras.</p>
          </div>
          <span className="text-sm text-muted-foreground">{Object.keys(reportOptions).length} Reportes</span>
        </div>

        {groups.map((group) => (
          <section key={group} aria-labelledby={`reports-${group}`}>
            <h2 id={`reports-${group}`} className="mb-3 text-lg font-semibold">{group}</h2>
            <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(reportOptions).filter(([, report]) => report.group === group).map(([path, report]) => (
                <li key={path} className="flex min-w-0 flex-col overflow-hidden rounded-lg border bg-card shadow-sm">
                  <div className="border-b px-4 py-3">
                    <h3 className="font-medium">{report.title}</h3>
                  </div>
                  <div className="flex flex-1 flex-col gap-4 p-4">
                    <p className="text-sm text-muted-foreground">{report.description}</p>
                    <div className="mt-auto flex justify-end">
                      <Button
                        nativeButton={false}
                        render={<Link href={`/reports/${path}`} />}
                        variant="outline"
                        size="sm"
                        aria-label={`Ver reporte: ${report.title}`}
                      >
                        Ver reporte
                        <ChevronRightIcon data-icon="inline-end" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </section>
    </main>
  )
}
