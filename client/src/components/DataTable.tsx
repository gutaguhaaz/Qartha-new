import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Edit3, Plus } from "lucide-react";
import StatusBadge from "./StatusBadge";
import { IdfTable } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


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

  // If DFO image exists and not in edit mode, show the image instead of table
  if (displayTable.dfo_image && !isEditable) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Fiber Optic Information (DFO)</h3>
        <div className="border rounded-lg overflow-hidden">
          <img
            src={displayTable.dfo_image}
            alt="DFO Diagram"
            className="w-full h-auto"
          />
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
          O D F  -  I D F  -  1 0 0 4
        </div>

        {/* Main ODF Table */}
        <div className="odf-table">
          <table>
            <thead>
              <tr>
                <th className="header-cell" rowSpan={2}>CABLE</th>
                <th className="header-cell" rowSpan={2}>BUFFER</th>
                <th className="header-cell" rowSpan={2}>DFO SPT</th>
                <th className="header-cell" colSpan={2}>DFO POSC & LABEL PORT</th>
                <th className="header-cell" colSpan={2}>DFO POSC & LABEL PORT</th>
                <th className="header-cell" colSpan={2}>DFO POSC & LABEL PORT</th>
                <th className="header-cell" colSpan={2}>DFO POSC & LABEL PORT</th>
              </tr>
              <tr>
                <th className="subheader-cell">1003</th>
                <th className="subheader-cell">5</th>
                <th className="subheader-cell">1101</th>
                <th className="subheader-cell">9</th>
                <th className="subheader-cell">1101</th>
                <th className="subheader-cell">11</th>
                <th className="subheader-cell">FR 0401</th>
                <th className="subheader-cell">13</th>
              </tr>
              <tr>
                <th className="subheader-cell"></th>
                <th className="subheader-cell"></th>
                <th className="subheader-cell">1</th>
                <th className="subheader-cell">Core 1</th>
                <th className="subheader-cell">6</th>
                <th className="subheader-cell">Core 1</th>
                <th className="subheader-cell">10</th>
                <th className="subheader-cell">Core 2</th>
                <th className="subheader-cell">14</th>
                <th className="subheader-cell">RING 1 IN</th>
              </tr>
            </thead>
            <tbody>
              {/* Row 1 */}
              <tr>
                <td className="cable-label" rowSpan={4}>48H OPTRONICS<br/>FROM FIBER HUT</td>
                <td className="buffer-cell brown">2</td>
                <td className="fiber-cell blue">2</td>
                <td className="port-cell">15</td>
                <td className="port-cell">1004</td>
                <td className="port-cell">17</td>
                <td className="dest-cell red">1004</td>
                <td className="port-cell">21</td>
                <td className="dest-cell red">Core 2</td>
                <td className="port-cell">23</td>
              </tr>

              {/* Row 2 */}
              <tr>
                <td className="buffer-cell brown">3</td>
                <td className="fiber-cell green">3</td>
                <td className="port-cell">16</td>
                <td className="port-cell">1001</td>
                <td className="port-cell">18</td>
                <td className="dest-cell red">Core 1</td>
                <td className="port-cell">22</td>
                <td className="dest-cell red">Core 2</td>
                <td className="port-cell">35</td>
              </tr>

              {/* Row 3 */}
              <tr>
                <td className="buffer-cell brown">4</td>
                <td className="fiber-cell brown">4</td>
                <td className="port-cell">30</td>
                <td className="port-cell">1002</td>
                <td className="port-cell">28</td>
                <td className="port-cell">41</td>
                <td className="port-cell">32</td>
                <td className="port-cell">45</td>
                <td className="port-cell">36</td>
              </tr>

              {/* Row 4 */}
              <tr>
                <td className="buffer-cell brown">5</td>
                <td className="fiber-cell blue">5</td>
                <td className="port-cell">Core 1</td>
                <td className="port-cell">42</td>
                <td className="port-cell">31</td>
                <td className="port-cell">46</td>
                <td className="port-cell">65</td>
                <td className="port-cell">48</td>
              </tr>

              {/* 12H OPTRONICS TO 1003 */}
              <tr>
                <td className="cable-label" rowSpan={3}>12H OPTRONICS<br/>TO 1003</td>
                <td className="buffer-cell">5</td>
                <td className="fiber-cell blue">6</td>
                <td className="port-cell">50</td>
                <td className="port-cell">1003</td>
                <td className="port-cell">53</td>
                <td className="port-cell">54</td>
                <td className="port-cell">57</td>
                <td className="port-cell">59</td>
              </tr>

              <tr>
                <td className="buffer-cell">6</td>
                <td className="fiber-cell orange">6</td>
                <td className="port-cell">52</td>
                <td className="dest-cell cyan">Core 2</td>
                <td className="port-cell">65</td>
                <td className="ptp-cell">PTP</td>
                <td className="port-cell">58</td>
                <td className="port-cell">70</td>
              </tr>

              <tr>
                <td className="buffer-cell">7</td>
                <td className="fiber-cell green">7</td>
                <td className="port-cell">64</td>
                <td className="port-cell">1001</td>
                <td className="port-cell">66</td>
                <td className="ptp-cell">PTP</td>
                <td className="port-cell">68</td>
                <td className="port-cell">72</td>
              </tr>

              {/* 24H WAVE OPTICS TO 1101 */}
              <tr>
                <td className="cable-label">24H WAVE OPTICS<br/>TO 1101</td>
                <td className="buffer-cell">8</td>
                <td className="fiber-cell blue">8</td>
                <td className="port-cell">Core 1</td>
                <td className="port-cell">75</td>
                <td className="port-cell">Core 2</td>
                <td className="port-cell">78</td>
                <td className="dest-cell cyan">TO 1101<br/>RING B US</td>
                <td className="port-cell">80</td>
              </tr>

              {/* Second section with different column headers */}
              <tr style={{backgroundColor: '#f0f0f0'}}>
                <td className="subheader-cell"></td>
                <td className="subheader-cell"></td>
                <td className="subheader-cell"></td>
                <td className="subheader-cell">1003</td>
                <td className="subheader-cell">5</td>
                <td className="subheader-cell">1101</td>
                <td className="subheader-cell">9</td>
                <td className="subheader-cell">1101</td>
                <td className="subheader-cell">TO 1003</td>
              </tr>

              <tr style={{backgroundColor: '#f8f8f8'}}>
                <td className="subheader-cell"></td>
                <td className="subheader-cell"></td>
                <td className="subheader-cell"></td>
                <td className="subheader-cell">Core 2</td>
                <td className="subheader-cell">Core 2</td>
                <td className="subheader-cell">Core 2</td>
                <td className="subheader-cell">Core 2</td>
                <td className="subheader-cell">RING OUT</td>
                <td className="subheader-cell">RING OUT</td>
              </tr>

              {/* Additional rows with ring configurations */}
              <tr>
                <td className="port-cell">25</td>
                <td className="port-cell">26</td>
                <td className="port-cell">33</td>
                <td className="port-cell">34</td>
                <td className="port-cell">37</td>
                <td className="port-cell">38</td>
                <td className="port-cell">47</td>
                <td className="port-cell">48</td>
                <td className="port-cell">81</td>
              </tr>

              <tr>
                <td className="port-cell">61</td>
                <td className="port-cell">62</td>
                <td className="port-cell">67</td>
                <td className="port-cell">69</td>
                <td className="port-cell">71</td>
                <td className="port-cell">73</td>
                <td className="port-cell">83</td>
                <td className="port-cell">84</td>
                <td className="port-cell">82</td>
              </tr>

              <tr>
                <td className="port-cell">81</td>
                <td className="port-cell">82</td>
                <td className="port-cell">83</td>
                <td className="port-cell">84</td>
                <td className="port-cell">83</td>
                <td className="port-cell">84</td>
                <td className="port-cell"></td>
                <td className="port-cell"></td>
                <td className="port-cell"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}