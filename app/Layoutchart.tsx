import React, { useState } from "react";
import Select, { MultiValue, SingleValue } from "react-select";

// Shared types
type Option = { value: string; label: string };
type TrendType = "" | "trend" | "reference";

// Custom styles for React Select to match your design
const selectStyles = {
  control: (base: any) => ({
    ...base,
    minHeight: '38px',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    '&:hover': {
      border: '1px solid #d1d5db'
    }
  })
};

// 1. Extract Filter (Single Select + Searchable)
function ExtractFilter({
  value,
  onChange,
  options = [],
}: {
  value: string;
  onChange: (value: string) => void;
  options?: Option[];
}) {
  const selectedOption = options.find(opt => opt.value === value) || null;

  return (
    <div className="mb-4">
      <label className="block font-semibold mb-1">Extract Filter</label>
      <Select
        value={selectedOption}
        onChange={(option: SingleValue<Option>) => onChange(option?.value || "")}
        options={options}
        placeholder="Select Extract"
        isClearable
        isSearchable
        styles={selectStyles}
      />
    </div>
  );
}

// 2. Data Source Filter (Single Select + Searchable)
function DataSourceFilter({
  value,
  onChange,
  sources = [],
}: {
  value: string;
  onChange: (value: string) => void;
  sources?: Option[];
}) {
  const selectedOption = sources.find(src => src.value === value) || null;

  return (
    <div className="mb-4">
      <label className="block font-semibold mb-1">Data Source Filter</label>
      <Select
        value={selectedOption}
        onChange={(option: SingleValue<Option>) => onChange(option?.value || "")}
        options={sources}
        placeholder="Select Data Source"
        isClearable
        isSearchable
        styles={selectStyles}
      />
    </div>
  );
}

// 3. Context Filter (Multi-Select + Searchable)
function ContextFilter({
  values,
  onChange,
  contexts = [],
}: {
  values: string[];
  onChange: (values: string[]) => void;
  contexts?: Option[];
}) {
  const selectedOptions = contexts.filter(ctx => values.includes(ctx.value));

  return (
    <div className="mb-4">
      <label className="block font-semibold mb-1">Context Filter</label>
      <Select
        value={selectedOptions}
        onChange={(options: MultiValue<Option>) => 
          onChange(options ? options.map(opt => opt.value) : [])
        }
        options={contexts}
        placeholder="Select Contexts"
        isMulti
        isClearable
        isSearchable
        styles={selectStyles}
      />
    </div>
  );
}

// 4. Dimension Filter (Multi-Select + Searchable)
function DimensionFilter({
  values,
  onChange,
  dimensions = [],
}: {
  values: string[];
  onChange: (values: string[]) => void;
  dimensions?: Option[];
}) {
  const selectedOptions = dimensions.filter(dim => values.includes(dim.value));

  return (
    <div className="mb-4">
      <label className="block font-semibold mb-1">Dimension Filter</label>
      <Select
        value={selectedOptions}
        onChange={(options: MultiValue<Option>) => 
          onChange(options ? options.map(opt => opt.value) : [])
        }
        options={dimensions}
        placeholder="Select Dimensions"
        isMulti
        isClearable
        isSearchable
        styles={selectStyles}
      />
    </div>
  );
}

// 5. Measure Filter (Multi-Select + Searchable)
function MeasureFilter({
  values,
  onChange,
  measures = [],
}: {
  values: string[];
  onChange: (values: string[]) => void;
  measures?: Option[];
}) {
  const selectedOptions = measures.filter(measure => values.includes(measure.value));

  return (
    <div className="mb-4">
      <label className="block font-semibold mb-1">Measure Filter</label>
      <Select
        value={selectedOptions}
        onChange={(options: MultiValue<Option>) => 
          onChange(options ? options.map(opt => opt.value) : [])
        }
        options={measures}
        placeholder="Select Measures"
        isMulti
        isClearable
        isSearchable
        styles={selectStyles}
      />
    </div>
  );
}

// 6. Table Calculation Filter (Single Select + Searchable)
function TableCalcFilter({
  value,
  onChange,
  calcs = [],
}: {
  value: string;
  onChange: (value: string) => void;
  calcs?: Option[];
}) {
  const selectedOption = calcs.find(calc => calc.value === value) || null;

  return (
    <div className="mb-4">
      <label className="block font-semibold mb-1">Table Calculation Filter</label>
      <Select
        value={selectedOption}
        onChange={(option: SingleValue<Option>) => onChange(option?.value || "")}
        options={calcs}
        placeholder="Select Calculation"
        isClearable
        isSearchable
        styles={selectStyles}
      />
    </div>
  );
}

// 7. Trend/Reference Line (Single Select)
function TrendReferenceLine({
  type,
  onChange,
}: {
  type: TrendType;
  onChange: (type: TrendType) => void;
}) {
  const options = [
    { value: "trend", label: "Trend Line" },
    { value: "reference", label: "Reference Line" }
  ];
  
  const selectedOption = options.find(opt => opt.value === type) || null;

  return (
    <div className="mb-4">
      <label className="block font-semibold mb-1">Trend/Reference Line</label>
      <Select
        value={selectedOption}
        onChange={(option: SingleValue<Option>) => onChange((option?.value as TrendType) || "")}
        options={options}
        placeholder="Select Line Type"
        isClearable
        styles={selectStyles}
      />
    </div>
  );
}

// Demo panel using all filters
export default function FiltersPanel() {
  const [extract, setExtract] = useState<string>("");
  const [dataSource, setDataSource] = useState<string>("");
  const [contexts, setContexts] = useState<string[]>([]);
  const [dimensions, setDimensions] = useState<string[]>([]);
  const [measures, setMeasures] = useState<string[]>([]);
  const [tableCalc, setTableCalc] = useState<string>("");
  const [trendType, setTrendType] = useState<TrendType>("");

  return (
    <div className="p-4 max-w-md mx-auto">
      <ExtractFilter
        value={extract}
        onChange={setExtract}
        options={[
          { value: "daily", label: "Daily" },
          { value: "monthly", label: "Monthly" },
          { value: "yearly", label: "Yearly" },
        ]}
      />
      <DataSourceFilter
        value={dataSource}
        onChange={setDataSource}
        sources={[
          { value: "db1", label: "Database 1" },
          { value: "db2", label: "Database 2" },
          { value: "api", label: "API Source" },
        ]}
      />
      <ContextFilter
        values={contexts}
        onChange={setContexts}
        contexts={[
          { value: "region", label: "Region" },
          { value: "department", label: "Department" },
          { value: "team", label: "Team" },
        ]}
      />
      <DimensionFilter
        values={dimensions}
        onChange={setDimensions}
        dimensions={[
          { value: "product", label: "Product" },
          { value: "category", label: "Category" },
          { value: "customer", label: "Customer" },
        ]}
      />
      <MeasureFilter
        values={measures}
        onChange={setMeasures}
        measures={[
          { value: "sales", label: "Sales" },
          { value: "profit", label: "Profit" },
          { value: "quantity", label: "Quantity" },
        ]}
      />
      <TableCalcFilter
        value={tableCalc}
        onChange={setTableCalc}
        calcs={[
          { value: "moving_avg", label: "Moving Average" },
          { value: "percent_change", label: "Percent Change" },
          { value: "running_total", label: "Running Total" },
        ]}
      />
      <TrendReferenceLine
        type={trendType}
        onChange={setTrendType}
      />
      
      {/* Debug output */}
      <div className="mt-6 p-4 bg-gray-100 rounded">
        <h3 className="font-semibold mb-2">Selected Values:</h3>
        <pre className="text-sm">
          {JSON.stringify({
            extract,
            dataSource,
            contexts,
            dimensions,
            measures,
            tableCalc,
            trendType
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
}