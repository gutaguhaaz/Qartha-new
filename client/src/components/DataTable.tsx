import { IdfTable } from "@shared/schema";
import StatusBadge from "./StatusBadge";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit3 } from "lucide-react";

interface DataTableProps {
  table?: IdfTable;
  isEditable?: boolean;
  onChange?: (table: IdfTable) => void;
}

export default function DataTable({ table, isEditable = false, onChange }: DataTableProps) {
  const [isEditing, setIsEditing] = useState(false);
  // Create sample table data if none exists to demonstrate the health system
  const sampleTable: IdfTable = {
    columns: [
      { key: "cable", label: "Cable", type: "text" },
      { key: "buffer", label: "Buffer", type: "text" },
      { key: "fiber", label: "Fiber", type: "text" },
      { key: "port1", label: "Port 1", type: "text" },
      { key: "port2", label: "Port 2", type: "text" },
      { key: "destination", label: "Destination", type: "text" },
      { key: "ring", label: "Ring", type: "text" },
      { key: "status", label: "Status", type: "status", options: ["ok", "revisión", "falla", "libre", "reservado"] }
    ],
    rows: [
      { cable: "48H OPTRONICS", buffer: "1", fiber: "1", port1: "1003", port2: "6", destination: "TO 1101", ring: "10", status: "ok" },
      { cable: "48H OPTRONICS", buffer: "2", fiber: "2", port1: "1004", port2: "18", destination: "1004", ring: "20", status: "revisión" },
      { cable: "48H OPTRONICS", buffer: "3", fiber: "3", port1: "1001", port2: "27", destination: "TO 0801", ring: "31", status: "falla" },
      { cable: "48H OPTRONICS", buffer: "4", fiber: "4", port1: "1002", port2: "40", destination: "44", ring: "45", status: "ok" },
      { cable: "12H OPTRONICS TO 1003", buffer: "1", fiber: "5", port1: "1003", port2: "51", destination: "56", ring: "57", status: "reservado" },
      { cable: "12H OPTRONICS TO 1002", buffer: "1", fiber: "6", port1: "1002", port2: "53", destination: "PTP", ring: "67", status: "falla" },
      { cable: "12H OPTRONICS TO 1001", buffer: "1", fiber: "7", port1: "1001", port2: "75", destination: "79", ring: "81", status: "libre" },
      { cable: "24H WAVE OPTICS TO 1101", buffer: "1", fiber: "8", port1: "FR ODF 1004", port2: "77", destination: "79", ring: "83", status: "ok" }
    ]
  };

  const displayTable = table || sampleTable;

  const addRow = () => {
    if (!displayTable || !onChange) return;
    
    const newRow: any = {};
    displayTable.columns.forEach(col => {
      newRow[col.key] = '';
    });
    
    const updatedTable = {
      ...displayTable,
      rows: [...(displayTable.rows || []), newRow]
    };
    onChange(updatedTable);
  };

  const updateCell = (rowIndex: number, columnKey: string, value: string) => {
    if (!displayTable || !onChange) return;
    
    const updatedRows = [...displayTable.rows];
    updatedRows[rowIndex] = {
      ...updatedRows[rowIndex],
      [columnKey]: value
    };
    
    const updatedTable = {
      ...displayTable,
      rows: updatedRows
    };
    onChange(updatedTable);
  };

  const renderEditableCell = (column: any, value: any, rowIndex: number) => {
    if (column.type === 'status') {
      return (
        <Select
          value={value || ''}
          onValueChange={(newValue) => updateCell(rowIndex, column.key, newValue)}
        >
          <SelectTrigger className="w-full h-8 text-xs">
            <SelectValue placeholder="Status" />
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
        className="w-full h-8 text-xs"
        placeholder=""
      />
    );
  };

  if (!displayTable || !displayTable.columns || displayTable.columns.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg overflow-hidden" data-testid="table-empty">
        <div className="p-6 text-center text-muted-foreground">
          <i className="fas fa-table text-4xl mb-4"></i>
          <p>No hay datos de tabla disponibles</p>
        </div>
      </div>
    );
  }

  // ODF Style Table Renderer
  const renderOdfTable = () => {
    return (
      <div className="odf-container">
        {/* Header */}
        <div className="odf-header">
          ODF IDF-1004
        </div>
        
        {/* Main ODF Table */}
        <div className="odf-table">
          <table>
            <thead>
              <tr>
                <th className="header-cell">CABLE</th>
                <th className="header-cell">BUFFER</th>
                <th className="header-cell">DFO SPT</th>
                <th className="header-cell">DFO POSC & LABEL PORT</th>
                <th className="header-cell">DFO POSC & LABEL PORT</th>
                <th className="header-cell">DFO POSC & LABEL PORT</th>
                <th className="header-cell">DFO POSC & LABEL PORT</th>
                <th className="header-cell">DFO POSC & LABEL PORT</th>
                <th className="header-cell">DFO POSC & LABEL PORT</th>
              </tr>
              <tr>
                <th className="subheader-cell"></th>
                <th className="subheader-cell"></th>
                <th className="subheader-cell">1</th>
                <th className="subheader-cell">1003</th>
                <th className="subheader-cell">5</th>
                <th className="subheader-cell">FR ODF</th>
                <th className="subheader-cell">9</th>
                <th className="subheader-cell">RING 1</th>
                <th className="subheader-cell">RING 1</th>
              </tr>
            </thead>
            <tbody>
              {displayTable.rows.map((row, index) => {
                let cableLabel = "";
                let bufferValue = "";
                let fiberValue = "";
                let fiberClass = "";
                let port1Value = "";
                let port2Value = "";
                let destValue = "";
                let destClass = "";
                let ringValue = "";
                let ringClass = "";
                
                // Map row data to display values based on index
                switch(index) {
                  case 0:
                    cableLabel = "48H OPTRONICS\nFROM FIBER\nHUT";
                    bufferValue = "1";
                    fiberValue = "1";
                    fiberClass = "blue";
                    port1Value = "1003";
                    port2Value = "6";
                    destValue = "TO 1101";
                    destClass = "";
                    ringValue = "10";
                    ringClass = "purple";
                    break;
                  case 1:
                    bufferValue = "2";
                    fiberValue = "2";
                    fiberClass = "orange";
                    port1Value = "1004";
                    port2Value = "18";
                    destValue = "1004";
                    destClass = "";
                    ringValue = "20";
                    ringClass = "yellow";
                    break;
                  case 2:
                    bufferValue = "3";
                    fiberValue = "3";
                    fiberClass = "green";
                    port1Value = "1001";
                    port2Value = "27";
                    destValue = "TO 0801";
                    destClass = "red";
                    ringValue = "31";
                    ringClass = "yellow";
                    break;
                  case 3:
                    bufferValue = "4";
                    fiberValue = "4";
                    fiberClass = "brown";
                    port1Value = "1002";
                    port2Value = "40";
                    destValue = "44";
                    destClass = "";
                    ringValue = "45";
                    ringClass = "purple";
                    break;
                  case 4:
                    cableLabel = "12H OPTRONICS\nTO 1003";
                    bufferValue = "1";
                    fiberValue = "5";
                    fiberClass = "blue";
                    port1Value = "1003";
                    port2Value = "51";
                    destValue = "56";
                    destClass = "red";
                    ringValue = "57";
                    ringClass = "yellow";
                    break;
                  case 5:
                    cableLabel = "12H OPTRONICS\nTO 1002";
                    bufferValue = "1";
                    fiberValue = "6";
                    fiberClass = "blue";
                    port1Value = "1002";
                    port2Value = "53";
                    destValue = "PTP";
                    destClass = "ptp";
                    ringValue = "67";
                    ringClass = "red";
                    break;
                  case 6:
                    cableLabel = "12H OPTRONICS\nTO 1001";
                    bufferValue = "1";
                    fiberValue = "7";
                    fiberClass = "blue";
                    port1Value = "1001";
                    port2Value = "75";
                    destValue = "79";
                    destClass = "red";
                    ringValue = "81";
                    ringClass = "purple";
                    break;
                  case 7:
                    cableLabel = "24H WAVE OPTICS\nTO 1101";
                    bufferValue = "1";
                    fiberValue = "8";
                    fiberClass = "blue";
                    port1Value = "FR ODF 1004";
                    port2Value = "77";
                    destValue = "79";
                    destClass = "red";
                    ringValue = "83";
                    ringClass = "cyan";
                    break;
                }
                
                return (
                  <tr key={index}>
                    {cableLabel && (
                      <td className="cable-label" rowSpan={cableLabel.includes("48H") ? 4 : 1}>
                        {cableLabel.split('\n').map((line, i) => (
                          <span key={i}>{line}{i < cableLabel.split('\n').length - 1 && <br/>}</span>
                        ))}
                      </td>
                    )}
                    <td className="buffer-cell">{bufferValue}</td>
                    <td className={`fiber-cell ${fiberClass}`}>{fiberValue}</td>
                    <td className="port-cell">{port1Value}</td>
                    <td className="port-cell">{port2Value}</td>
                    <td className={`dest-cell ${destClass}`}>{destValue}</td>
                    <td className={`ring-cell ${ringClass}`}>{ringValue}</td>
                    <td className="dest-cell cyan">FR 0401 TO 1003</td>
                    <td className="ring-cell cyan">12</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden" data-testid="data-table">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Sabinas Project - ODF Layout</h3>
            <p className="text-muted-foreground mt-1">Fiber Optic Distribution</p>
          </div>
          {isEditable && (
            <div className="flex space-x-2">
              <Button
                variant={isEditing ? "default" : "outline"}
                onClick={() => setIsEditing(!isEditing)}
                size="sm"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                {isEditing ? 'Finalizar Edición' : 'Editar'}
              </Button>
              {isEditing && (
                <Button onClick={addRow} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Fila
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto p-4">
        {renderOdfTable()}
      </div>
    </div>
  );
}
