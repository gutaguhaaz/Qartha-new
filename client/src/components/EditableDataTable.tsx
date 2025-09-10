
import { useState } from "react";
import { IdfTable } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import StatusBadge from "./StatusBadge";

interface EditableDataTableProps {
  table?: IdfTable;
  onChange: (table: IdfTable) => void;
}

export default function EditableDataTable({ table, onChange }: EditableDataTableProps) {
  const [isEditing, setIsEditing] = useState(false);
  
  // Debug logging
  console.log('EditableDataTable received table:', table);

  if (!table || !table.columns || table.columns.length === 0 || !table.rows) {
    return (
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-6 text-center text-muted-foreground">
          <i className="fas fa-table text-4xl mb-4"></i>
          <p>No table data available</p>
          <Button 
            onClick={() => {
              const newTable: IdfTable = {
                columns: [
                  { key: 'tray', label: 'Charola', type: 'text' },
                  { key: 'panel', label: 'Patch Panel', type: 'text' },
                  { key: 'port', label: 'Puerto', type: 'number' },
                  { key: 'fiber_id', label: 'Fibra', type: 'text' },
                  { key: 'to_room', label: 'Destino (Cuarto)', type: 'text' },
                  { key: 'to_panel', label: 'Destino (Panel)', type: 'text' },
                  { key: 'to_port', label: 'Puerto Destino', type: 'number' },
                  { key: 'status', label: 'Estado', type: 'status' }
                ],
                rows: []
              };
              onChange(newTable);
              setIsEditing(true);
            }}
            className="mt-4"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Table
          </Button>
        </div>
      </div>
    );
  }

  const addRow = () => {
    const newRow: any = {};
    table.columns.forEach(col => {
      newRow[col.key] = '';
    });
    
    const updatedTable = {
      ...table,
      rows: [...(table.rows || []), newRow]
    };
    onChange(updatedTable);
  };

  const removeRow = (rowIndex: number) => {
    const updatedTable = {
      ...table,
      rows: table.rows.filter((_, index) => index !== rowIndex)
    };
    onChange(updatedTable);
  };

  const updateCell = (rowIndex: number, columnKey: string, value: string) => {
    const updatedRows = [...table.rows];
    updatedRows[rowIndex] = {
      ...updatedRows[rowIndex],
      [columnKey]: value
    };
    
    const updatedTable = {
      ...table,
      rows: updatedRows
    };
    onChange(updatedTable);
  };

  const renderCell = (column: any, value: any, rowIndex: number) => {
    if (!isEditing) {
      if (column.type === 'status') {
        return <StatusBadge status={value || ''} />;
      }
      return value || '-';
    }

    if (column.type === 'status') {
      return (
        <Select 
          value={value || ''} 
          onValueChange={(newValue) => updateCell(rowIndex, column.key, newValue)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ok">OK</SelectItem>
            <SelectItem value="revisión">Under Review</SelectItem>
            <SelectItem value="falla">Critical Failure</SelectItem>
            <SelectItem value="libre">Available</SelectItem>
            <SelectItem value="reservado">Reserved</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        value={value || ''}
        onChange={(e) => updateCell(rowIndex, column.key, e.target.value)}
        className="w-full"
        placeholder={`Enter ${column.label.toLowerCase()}`}
      />
    );
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Device Table</h3>
            <p className="text-muted-foreground mt-1">
              {(table.rows && Array.isArray(table.rows) ? table.rows.length : 0)} devices • {isEditing ? 'Editing Mode' : 'View Mode'}
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant={isEditing ? "default" : "outline"}
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? 'Done Editing' : 'Edit Table'}
            </Button>
            {isEditing && (
              <Button onClick={addRow} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Row
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              {table.columns.map((column, index) => (
                <th
                  key={index}
                  className="text-left p-4 font-medium text-sm"
                >
                  {column.label}
                </th>
              ))}
              {isEditing && (
                <th className="text-left p-4 font-medium text-sm w-16">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {(table.rows || []).map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-t border-border hover:bg-accent/50"
              >
                {table.columns.map((column, colIndex) => (
                  <td key={colIndex} className="p-4">
                    {renderCell(column, row[column.key], rowIndex)}
                  </td>
                ))}
                {isEditing && (
                  <td className="p-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRow(rowIndex)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
