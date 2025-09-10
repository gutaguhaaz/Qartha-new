import { IdfTable } from "@shared/schema";
import StatusBadge from "./StatusBadge";

interface DataTableProps {
  table?: IdfTable;
}

export default function DataTable({ table }: DataTableProps) {
  if (!table || !table.columns || table.columns.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg overflow-hidden" data-testid="table-empty">
        <div className="p-6 text-center text-muted-foreground">
          <i className="fas fa-table text-4xl mb-4"></i>
          <p>No hay datos de tabla disponibles</p>
        </div>
      </div>
    );
  }

  const renderCellContent = (column: any, value: any) => {
    if (column.type === 'status') {
      return <StatusBadge status={value || ''} />;
    }
    return value || '-';
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden" data-testid="data-table">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold">Dispositivos y Conexiones</h3>
        <p className="text-muted-foreground mt-1">Lista completa de dispositivos y estado actual</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full" data-testid="table-content">
          <thead className="bg-muted/50">
            <tr>
              {table.columns.map((column, index) => (
                <th
                  key={index}
                  className="text-left p-4 font-medium text-sm"
                  data-testid={`header-${column.key}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-t border-border hover:bg-accent/50"
                data-testid={`row-${rowIndex}`}
              >
                {table.columns.map((column, colIndex) => (
                  <td
                    key={colIndex}
                    className="p-4"
                    data-testid={`cell-${rowIndex}-${column.key}`}
                  >
                    {renderCellContent(column, row[column.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
