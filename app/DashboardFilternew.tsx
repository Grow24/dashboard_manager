import React, { useState, useMemo } from "react";

type DataRow = {
  Category: string;
  SubCategory: string;
  Region: string;
  Sales: number;
  Profit: number;
  Date: string; // ISO string
};

const rawData: DataRow[] = [
  { Category: "Furniture", SubCategory: "Chairs", Region: "West", Sales: 200, Profit: 50, Date: "2023-01-15" },
  { Category: "Furniture", SubCategory: "Tables", Region: "East", Sales: 450, Profit: 120, Date: "2023-02-20" },
  { Category: "Technology", SubCategory: "Phones", Region: "West", Sales: 800, Profit: 200, Date: "2023-03-10" },
  { Category: "Technology", SubCategory: "Accessories", Region: "South", Sales: 150, Profit: 30, Date: "2023-01-25" },
  { Category: "Office Supplies", SubCategory: "Paper", Region: "North", Sales: 100, Profit: 20, Date: "2023-04-05" },
  { Category: "Office Supplies", SubCategory: "Binders", Region: "East", Sales: 300, Profit: 70, Date: "2023-05-15" },
  { Category: "Furniture", SubCategory: "Chairs", Region: "South", Sales: 250, Profit: 60, Date: "2023-06-01" },
  { Category: "Technology", SubCategory: "Phones", Region: "North", Sales: 900, Profit: 250, Date: "2023-07-20" },
  { Category: "Office Supplies", SubCategory: "Paper", Region: "West", Sales: 120, Profit: 25, Date: "2023-08-10" },
  { Category: "Furniture", SubCategory: "Tables", Region: "South", Sales: 400, Profit: 100, Date: "2023-09-05" },
];

// Utility for unique values
const uniqueValues = (data: DataRow[], key: keyof DataRow) =>
  Array.from(new Set(data.map((d) => d[key])));

const FilterPopup: React.FC<{
  title: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  onClose: () => void;
}> = ({ title, options, selected, onChange, onClose }) => {
  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((v) => v !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-lg z-50 w-80 max-h-[70vh] overflow-auto p-6">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="space-y-2 max-h-56 overflow-y-auto mb-6">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center space-x-2 cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggleOption(opt)}
                className="form-checkbox h-5 w-5 text-indigo-600"
              />
              <span className="text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
};

const TableauStyleFilters: React.FC = () => {
  // Step 1: Extract Filter (filter by Date range)
  const [extractFilterDates, setExtractFilterDates] = useState<string[]>([]); // store selected months YYYY-MM

  // Step 2: Data Source Filter (filter by Region)
  const [dataSourceFilterRegions, setDataSourceFilterRegions] = useState<string[]>([]);

  // Step 3: Context Filter (filter by Category)
  const [contextFilterCategories, setContextFilterCategories] = useState<string[]>([]);

  // Step 4: Dimension Filter (filter by SubCategory)
  const [dimensionFilterSubCategories, setDimensionFilterSubCategories] = useState<string[]>([]);

  // Step 5: Measure Filter (filter by Sales range)
  const [measureFilterSalesRange, setMeasureFilterSalesRange] = useState<[number, number] | null>(null);

  // Step 6: Table Calculation Filter (filter by Profit ratio)
  // We'll calculate profit ratio = Profit / Sales and filter by min threshold
  const [tableCalcFilterProfitRatioMin, setTableCalcFilterProfitRatioMin] = useState<number | null>(null);

  // Popup control
  const [activeFilter, setActiveFilter] = useState<
    | "extract"
    | "dataSource"
    | "context"
    | "dimension"
    | "measure"
    | "tableCalc"
    | null
  >(null);

  // Helper: get months from rawData for Extract Filter
  const allMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    rawData.forEach((d) => {
      const m = d.Date.slice(0, 7); // YYYY-MM
      monthsSet.add(m);
    });
    return Array.from(monthsSet).sort();
  }, []);

  // Apply filters in order

  // 1. Extract Filter: filter by selected months
  const afterExtractFilter = useMemo(() => {
    if (extractFilterDates.length === 0) return rawData;
    return rawData.filter((d) => extractFilterDates.includes(d.Date.slice(0, 7)));
  }, [extractFilterDates]);

  // 2. Data Source Filter: filter by Region
  const afterDataSourceFilter = useMemo(() => {
    if (dataSourceFilterRegions.length === 0) return afterExtractFilter;
    return afterExtractFilter.filter((d) => dataSourceFilterRegions.includes(d.Region));
  }, [dataSourceFilterRegions, afterExtractFilter]);

  // 3. Context Filter: filter by Category
  const afterContextFilter = useMemo(() => {
    if (contextFilterCategories.length === 0) return afterDataSourceFilter;
    return afterDataSourceFilter.filter((d) => contextFilterCategories.includes(d.Category));
  }, [contextFilterCategories, afterDataSourceFilter]);

  // 4. Dimension Filter: filter by SubCategory
  const afterDimensionFilter = useMemo(() => {
    if (dimensionFilterSubCategories.length === 0) return afterContextFilter;
    return afterContextFilter.filter((d) => dimensionFilterSubCategories.includes(d.SubCategory));
  }, [dimensionFilterSubCategories, afterContextFilter]);

  // 5. Measure Filter: filter by Sales range
  const afterMeasureFilter = useMemo(() => {
    if (!measureFilterSalesRange) return afterDimensionFilter;
    const [min, max] = measureFilterSalesRange;
    return afterDimensionFilter.filter((d) => d.Sales >= min && d.Sales <= max);
  }, [measureFilterSalesRange, afterDimensionFilter]);

  // 6. Table Calculation Filter: filter by Profit ratio min threshold
  const afterTableCalcFilter = useMemo(() => {
    if (tableCalcFilterProfitRatioMin === null) return afterMeasureFilter;
    return afterMeasureFilter.filter(
      (d) => d.Sales > 0 && d.Profit / d.Sales >= tableCalcFilterProfitRatioMin
    );
  }, [tableCalcFilterProfitRatioMin, afterMeasureFilter]);

  // Options for each filter based on current data state (for dynamic filtering)
  const dataSourceRegions = useMemo(() => uniqueValues(afterExtractFilter, "Region"), [afterExtractFilter]);
  const contextCategories = useMemo(() => uniqueValues(afterDataSourceFilter, "Category"), [afterDataSourceFilter]);
  const dimensionSubCategories = useMemo(() => uniqueValues(afterContextFilter, "SubCategory"), [afterContextFilter]);

  // UI for Measure Filter (Sales range)
  const salesMin = 0;
  const salesMax = 1000;

  // UI for Table Calculation Filter (Profit ratio)
  const profitRatioMin = 0;
  const profitRatioMax = 1;

  // Handlers for measure filter inputs
  const handleSalesRangeChange = (e: React.ChangeEvent<HTMLInputElement>, bound: "min" | "max") => {
    const val = Number(e.target.value);
    if (measureFilterSalesRange) {
      if (bound === "min") setMeasureFilterSalesRange([val, measureFilterSalesRange[1]]);
      else setMeasureFilterSalesRange([measureFilterSalesRange[0], val]);
    } else {
      setMeasureFilterSalesRange(bound === "min" ? [val, salesMax] : [salesMin, val]);
    }
  };

  // Handler for profit ratio filter input
  const handleProfitRatioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setTableCalcFilterProfitRatioMin(val);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans text-gray-900">
      <h2 className="text-3xl font-bold mb-4">Filter Flow Demo</h2>
      <p className="mb-6 text-gray-700">
        Apply filters step-by-step in the order:
      </p>
      <ol className="list-decimal list-inside mb-8 space-y-1 text-gray-600">
        <li>Extract Filter (Date Month)</li>
        <li>Data Source Filter (Region)</li>
        <li>Context Filter (Category)</li>
        <li>Dimension Filter (SubCategory)</li>
        <li>Measure Filter (Sales Range)</li>
        <li>Table Calculation Filter (Profit Ratio Min)</li>
      </ol>

      <div className="mb-8 flex flex-wrap gap-3">
        <button
          onClick={() => setActiveFilter("extract")}
          className="btn-primary"
        >
          Extract Filter
        </button>
        <button
          onClick={() => setActiveFilter("dataSource")}
          disabled={afterExtractFilter.length === 0}
          title={afterExtractFilter.length === 0 ? "Apply Extract Filter first" : ""}
          className={`btn-primary ${afterExtractFilter.length === 0 ? "opacity-50 cursor-not-allowed" : "hover:bg-indigo-700"}`}
        >
          Data Source Filter
        </button>
        <button
          onClick={() => setActiveFilter("context")}
          disabled={afterDataSourceFilter.length === 0}
          title={afterDataSourceFilter.length === 0 ? "Apply Data Source Filter first" : ""}
          className={`btn-primary ${afterDataSourceFilter.length === 0 ? "opacity-50 cursor-not-allowed" : "hover:bg-indigo-700"}`}
        >
          Context Filter
        </button>
        <button
          onClick={() => setActiveFilter("dimension")}
          disabled={afterContextFilter.length === 0}
          title={afterContextFilter.length === 0 ? "Apply Context Filter first" : ""}
          className={`btn-primary ${afterContextFilter.length === 0 ? "opacity-50 cursor-not-allowed" : "hover:bg-indigo-700"}`}
        >
          Dimension Filter
        </button>
        <button
          onClick={() => setActiveFilter("measure")}
          disabled={afterDimensionFilter.length === 0}
          title={afterDimensionFilter.length === 0 ? "Apply Dimension Filter first" : ""}
          className={`btn-primary ${afterDimensionFilter.length === 0 ? "opacity-50 cursor-not-allowed" : "hover:bg-indigo-700"}`}
        >
          Measure Filter
        </button>
        <button
          onClick={() => setActiveFilter("tableCalc")}
          disabled={afterMeasureFilter.length === 0}
          title={afterMeasureFilter.length === 0 ? "Apply Measure Filter first" : ""}
          className={`btn-primary ${afterMeasureFilter.length === 0 ? "opacity-50 cursor-not-allowed" : "hover:bg-indigo-700"}`}
        >
          Table Calculation Filter
        </button>
      </div>

      {/* Filter Popups */}
      {activeFilter === "extract" && (
        <FilterPopup
          title="Extract Filter: Select Months"
          options={allMonths}
          selected={extractFilterDates}
          onChange={setExtractFilterDates}
          onClose={() => setActiveFilter(null)}
        />
      )}

      {activeFilter === "dataSource" && (
        <FilterPopup
          title="Data Source Filter: Select Regions"
          options={dataSourceRegions}
          selected={dataSourceFilterRegions}
          onChange={setDataSourceFilterRegions}
          onClose={() => setActiveFilter(null)}
        />
      )}

      {activeFilter === "context" && (
        <FilterPopup
          title="Context Filter: Select Categories"
          options={contextCategories}
          selected={contextFilterCategories}
          onChange={setContextFilterCategories}
          onClose={() => setActiveFilter(null)}
        />
      )}

      {activeFilter === "dimension" && (
        <FilterPopup
          title="Dimension Filter: Select SubCategories"
          options={dimensionSubCategories}
          selected={dimensionFilterSubCategories}
          onChange={setDimensionFilterSubCategories}
          onClose={() => setActiveFilter(null)}
        />
      )}

      {activeFilter === "measure" && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setActiveFilter(null)} />
          <div className="fixed top-1/4 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-lg z-50 w-80 p-6">
            <h3 className="text-lg font-semibold mb-4">Measure Filter: Sales Range</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-1 font-medium">
                  Min Sales
                </label>
                <input
                  type="number"
                  min={salesMin}
                  max={salesMax}
                  value={measureFilterSalesRange ? measureFilterSalesRange[0] : salesMin}
                  onChange={(e) => handleSalesRangeChange(e, "min")}
                  className="input-primary"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1 font-medium">
                  Max Sales
                </label>
                <input
                  type="number"
                  min={salesMin}
                  max={salesMax}
                  value={measureFilterSalesRange ? measureFilterSalesRange[1] : salesMax}
                  onChange={(e) => handleSalesRangeChange(e, "max")}
                  className="input-primary"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setActiveFilter(null)}
                className="btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}

      {activeFilter === "tableCalc" && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setActiveFilter(null)} />
          <div className="fixed top-1/4 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-lg z-50 w-80 p-6">
            <h3 className="text-lg font-semibold mb-4">Table Calculation Filter: Profit Ratio Min</h3>
            <div>
              <label className="block text-gray-700 mb-1 font-medium">
                Min Profit Ratio (Profit / Sales)
              </label>
              <input
                type="number"
                min={profitRatioMin}
                max={profitRatioMax}
                step={0.01}
                value={tableCalcFilterProfitRatioMin ?? 0}
                onChange={handleProfitRatioChange}
                className="input-primary"
              />
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setActiveFilter(null)}
                className="btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}

      {/* Display filtered data */}
      <h3 className="text-xl font-semibold mb-4">
        Filtered Data ({afterTableCalcFilter.length} rows):
      </h3>
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-indigo-50">
            <tr>
              {["Category", "SubCategory", "Region", "Sales", "Profit", "Date", "Profit Ratio"].map((header) => (
                <th
                  key={header}
                  className="px-4 py-3 text-left font-semibold text-indigo-700"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {afterTableCalcFilter.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-6 text-gray-500">
                  No data matches the filters.
                </td>
              </tr>
            ) : (
              afterTableCalcFilter.map((row, i) => (
                <tr
                  key={i}
                  className={i % 2 === 0 ? "bg-white" : "bg-indigo-50"}
                >
                  <td className="px-4 py-2">{row.Category}</td>
                  <td className="px-4 py-2">{row.SubCategory}</td>
                  <td className="px-4 py-2">{row.Region}</td>
                  <td className="px-4 py-2">{row.Sales}</td>
                  <td className="px-4 py-2">{row.Profit}</td>
                  <td className="px-4 py-2">{row.Date}</td>
                  <td className="px-4 py-2">{(row.Profit / row.Sales).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Tailwind CSS utility classes for buttons and inputs */}
      <style>{`
        .btn-primary {
          @apply bg-indigo-600 text-white px-4 py-2 rounded-md shadow-sm transition-colors duration-200;
        }
        .btn-primary:hover {
          @apply bg-indigo-700;
        }
        .input-primary {
          @apply w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500;
        }
        input[type="checkbox"].form-checkbox {
          @apply rounded;
        }
      `}</style>
    </div>
  );
};

export default TableauStyleFilters;