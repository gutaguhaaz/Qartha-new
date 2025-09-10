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
          <div className="odf-title">ODF IDF-1004</div>
        </div>
        
        {/* Main ODF Table */}
        <div className="odf-table">
          {/* Column Headers */}
          <div className="odf-headers">
            <div className="header-cell">CABLE</div>
            <div className="header-cell">BUFFER</div>
            <div className="header-cell">DFO SPT</div>
            <div className="header-cell">DFO POSC & LABEL PORT</div>
            <div className="header-cell">DFO POSC & LABEL PORT</div>
            <div className="header-cell">DFO POSC & LABEL PORT</div>
            <div className="header-cell">DFO POSC & LABEL PORT</div>
            <div className="header-cell">DFO POSC & LABEL PORT</div>
            <div className="header-cell">DFO POSC & LABEL PORT</div>
          </div>
          
          {/* Subheaders */}
          <div className="odf-subheaders">
            <div className="subheader-cell"></div>
            <div className="subheader-cell"></div>
            <div className="subheader-cell">1</div>
            <div className="subheader-cell">1003</div>
            <div className="subheader-cell">5</div>
            <div className="subheader-cell">FR ODF</div>
            <div className="subheader-cell">9</div>
            <div className="subheader-cell">RING 1</div>
            <div className="subheader-cell">RING 1</div>
          </div>
          
          {/* Cable Sections */}
          <div className="cable-section">
            <div className="cable-label">48H OPTRONICS FROM FIBER HUT</div>
            <div className="buffer-sections">
              {/* Buffer 1 */}
              <div className="buffer-row">
                <div className="buffer-cell">1</div>
                <div className="fiber-cells">
                  <div className="fiber-cell blue">1</div>
                  <div className="port-cell">1003</div>
                  <div className="port-cell">6</div>
                  <div className="dest-cell">TO 1101</div>
                  <div className="ring-cell purple">10</div>
                  <div className="dest-cell cyan">FR 0401 TO 1003</div>
                  <div className="ring-cell cyan">12</div>
                  <div className="dest-cell cyan">FR 1004 TO 1003</div>
                </div>
              </div>
              
              {/* Buffer 2 */}
              <div className="buffer-row">
                <div className="buffer-cell">2</div>
                <div className="fiber-cells">
                  <div className="fiber-cell orange">2</div>
                  <div className="port-cell">1004</div>
                  <div className="port-cell">18</div>
                  <div className="port-cell">1004</div>
                  <div className="ring-cell yellow">20</div>
                  <div className="port-cell">1004</div>
                  <div className="ring-cell yellow">21</div>
                  <div className="ring-cell magenta">23</div>
                  <div className="ring-cell magenta">24</div>
                </div>
              </div>
              
              {/* Buffer 3 */}
              <div className="buffer-row">
                <div className="buffer-cell">3</div>
                <div className="fiber-cells">
                  <div className="fiber-cell green">3</div>
                  <div className="port-cell">1001</div>
                  <div className="port-cell">27</div>
                  <div className="port-cell">1001</div>
                  <div className="port-cell">29</div>
                  <div className="dest-cell red">TO 0801</div>
                  <div className="ring-cell yellow">31</div>
                  <div className="ring-cell yellow">33</div>
                  <div className="ring-cell cyan">35</div>
                </div>
              </div>
              
              {/* Buffer 4 */}
              <div className="buffer-row">
                <div className="buffer-cell brown">4</div>
                <div className="fiber-cells">
                  <div className="fiber-cell brown">4</div>
                  <div className="port-cell">1002</div>
                  <div className="port-cell">40</div>
                  <div className="port-cell">1002</div>
                  <div className="port-cell">42</div>
                  <div className="port-cell">44</div>
                  <div className="ring-cell purple">45</div>
                  <div className="ring-cell purple">46</div>
                  <div className="ring-cell cyan">47</div>
                  <div className="ring-cell cyan">48</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Additional Cable Sections */}
          <div className="cable-section">
            <div className="cable-label">12H OPTRONICS TO 1003</div>
            <div className="buffer-sections">
              <div className="buffer-row">
                <div className="buffer-cell">1</div>
                <div className="fiber-cells">
                  <div className="fiber-cell blue">5</div>
                  <div className="port-cell">1003</div>
                  <div className="port-cell">51</div>
                  <div className="port-cell">1003</div>
                  <div className="port-cell">53</div>
                  <div className="port-cell red">56</div>
                  <div className="ring-cell yellow">57</div>
                  <div className="ring-cell yellow">58</div>
                  <div className="ring-cell magenta">59</div>
                  <div className="ring-cell magenta">60</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="cable-section">
            <div className="cable-label">12H OPTRONICS TO 1002</div>
            <div className="buffer-sections">
              <div className="buffer-row">
                <div className="buffer-cell">1</div>
                <div className="fiber-cells">
                  <div className="fiber-cell blue">6</div>
                  <div className="port-cell">1002</div>
                  <div className="port-cell">53</div>
                  <div className="port-cell">1002</div>
                  <div className="port-cell">65</div>
                  <div className="ptp-cell">PTP</div>
                  <div className="port-cell red">67</div>
                  <div className="ring-cell yellow">69</div>
                  <div className="ring-cell yellow">70</div>
                  <div className="ring-cell magenta">71</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="cable-section">
            <div className="cable-label">12H OPTRONICS TO 1001</div>
            <div className="buffer-sections">
              <div className="buffer-row">
                <div className="buffer-cell">1</div>
                <div className="fiber-cells">
                  <div className="fiber-cell blue">7</div>
                  <div className="port-cell">1001</div>
                  <div className="port-cell">75</div>
                  <div className="port-cell">1001</div>
                  <div className="port-cell">77</div>
                  <div className="port-cell red">79</div>
                  <div className="ring-cell purple">81</div>
                  <div className="ring-cell purple">82</div>
                  <div className="ring-cell cyan">83</div>
                  <div className="ring-cell cyan">84</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="cable-section">
            <div className="cable-label">24H WAVE OPTICS TO 1101</div>
            <div className="buffer-sections">
              <div className="buffer-row">
                <div className="buffer-cell">1</div>
                <div className="fiber-cells">
                  <div className="fiber-cell blue">8</div>
                  <div className="dest-cell">FR ODF 1004</div>
                  <div className="dest-cell">FR ODF 1004</div>
                  <div className="port-cell">77</div>
                  <div className="port-cell red">79</div>
                  <div className="ring-cell purple">81</div>
                  <div className="ring-cell purple">82</div>
                  <div className="ring-cell cyan">83</div>
                  <div className="ring-cell cyan">84</div>
                </div>
              </div>
            </div>
          </div>
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
