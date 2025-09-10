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
              {/* 48H OPTRONICS FROM FIBER HUT */}
              <tr>
                <td className="cable-label" rowSpan={4}>48H OPTRONICS<br/>FROM FIBER<br/>HUT</td>
                <td className="buffer-cell">1</td>
                <td className="fiber-cell blue">1</td>
                <td className="port-cell">1003</td>
                <td className="port-cell">6</td>
                <td className="dest-cell">TO 1101</td>
                <td className="ring-cell purple">10</td>
                <td className="dest-cell cyan">FR 0401 TO 1003</td>
                <td className="ring-cell cyan">12</td>
              </tr>
              <tr>
                <td className="buffer-cell">2</td>
                <td className="fiber-cell orange">2</td>
                <td className="port-cell">1004</td>
                <td className="port-cell">18</td>
                <td className="port-cell">1004</td>
                <td className="ring-cell yellow">20</td>
                <td className="port-cell">1004</td>
                <td className="ring-cell yellow">21</td>
              </tr>
              <tr>
                <td className="buffer-cell">3</td>
                <td className="fiber-cell green">3</td>
                <td className="port-cell">1001</td>
                <td className="port-cell">27</td>
                <td className="port-cell">1001</td>
                <td className="port-cell">29</td>
                <td className="dest-cell red">TO 0801</td>
                <td className="ring-cell yellow">31</td>
              </tr>
              <tr>
                <td className="buffer-cell brown">4</td>
                <td className="fiber-cell brown">4</td>
                <td className="port-cell">1002</td>
                <td className="port-cell">40</td>
                <td className="port-cell">1002</td>
                <td className="port-cell">42</td>
                <td className="port-cell">44</td>
                <td className="ring-cell purple">45</td>
              </tr>
              
              {/* 12H OPTRONICS TO 1003 */}
              <tr>
                <td className="cable-label" rowSpan={1}>12H OPTRONICS<br/>TO 1003</td>
                <td className="buffer-cell">1</td>
                <td className="fiber-cell blue">5</td>
                <td className="port-cell">1003</td>
                <td className="port-cell">51</td>
                <td className="port-cell">1003</td>
                <td className="port-cell">53</td>
                <td className="dest-cell red">56</td>
                <td className="ring-cell yellow">57</td>
              </tr>
              
              {/* 12H OPTRONICS TO 1002 */}
              <tr>
                <td className="cable-label" rowSpan={1}>12H OPTRONICS<br/>TO 1002</td>
                <td className="buffer-cell">1</td>
                <td className="fiber-cell blue">6</td>
                <td className="port-cell">1002</td>
                <td className="port-cell">53</td>
                <td className="port-cell">1002</td>
                <td className="port-cell">65</td>
                <td className="ptp-cell">PTP</td>
                <td className="dest-cell red">67</td>
              </tr>
              
              {/* 12H OPTRONICS TO 1001 */}
              <tr>
                <td className="cable-label" rowSpan={1}>12H OPTRONICS<br/>TO 1001</td>
                <td className="buffer-cell">1</td>
                <td className="fiber-cell blue">7</td>
                <td className="port-cell">1001</td>
                <td className="port-cell">75</td>
                <td className="port-cell">1001</td>
                <td className="port-cell">77</td>
                <td className="dest-cell red">79</td>
                <td className="ring-cell purple">81</td>
              </tr>
              
              {/* 24H WAVE OPTICS TO 1101 */}
              <tr>
                <td className="cable-label" rowSpan={1}>24H WAVE OPTICS<br/>TO 1101</td>
                <td className="buffer-cell">1</td>
                <td className="fiber-cell blue">8</td>
                <td className="dest-cell">FR ODF 1004</td>
                <td className="dest-cell">FR ODF 1004</td>
                <td className="port-cell">77</td>
                <td className="dest-cell red">79</td>
                <td className="ring-cell purple">81</td>
                <td className="ring-cell cyan">83</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden" data-testid="data-table">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold">Sabinas Project - ODF Layout</h3>
        <p className="text-muted-foreground mt-1">Distribución óptica detallada del frame</p>
      </div>

      <div className="overflow-x-auto p-4">
        {renderOdfTable()}
      </div>
    </div>
  );
}
