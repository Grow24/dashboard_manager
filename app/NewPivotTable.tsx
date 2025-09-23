import React, { useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";

const data = [
  { Country: "USA", Product: "Mobile", Sales: 100, Quantity: 10 },
  { Country: "USA", Product: "Mobile", Sales: 120, Quantity: 12 },
  { Country: "USA", Product: "Laptop", Sales: 200, Quantity: 20 },
  { Country: "Canada", Product: "Mobile", Sales: 150, Quantity: 15 },
  { Country: "Canada", Product: "Laptop", Sales: 180, Quantity: 18 },
  { Country: "Canada", Product: "Laptop", Sales: 220, Quantity: 22 },
];

// Helper to sum numeric fields
const sumByField = (items, field) =>
  items.reduce((acc, item) => acc + (item[field] || 0), 0);

// Compute subtotals grouped by Country
function computeSubtotals(data, groupByField, measureFields) {
  const grouped = data.reduce((acc, row) => {
    const key = row[groupByField];
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  const result = [];

  Object.entries(grouped).forEach(([groupKey, rows]) => {
    // Add group rows
    result.push(...rows);

    // Add subtotal row
    const subtotalRow = { [groupByField]: `${groupKey} Subtotal`, isSubtotal: true };
    measureFields.forEach((field) => {
      subtotalRow[field] = sumByField(rows, field);
    });
    result.push(subtotalRow);
  });

  return result;
}

// Compute grand total row
function computeGrandTotal(data, measureFields) {
  const grandTotalRow = { Country: "Grand Total", isGrandTotal: true };
  measureFields.forEach((field) => {
    grandTotalRow[field] = sumByField(data, field);
  });
  return grandTotalRow;
}

export default function PivotTableWithTotals() {
  const groupByField = "Country";
  const measureFields = ["Sales", "Quantity"];

  // Compute data with subtotals
  const dataWithSubtotals = useMemo(() => {
    const withSubtotals = computeSubtotals(data, groupByField, measureFields);
    const grandTotal = computeGrandTotal(data, measureFields);
    return [...withSubtotals, grandTotal];
  }, [data]);

  const columnHelper = createColumnHelper();

  const columns = useMemo(() => {
    return [
      columnHelper.accessor(groupByField, {
        header: groupByField,
        cell: (info) => {
          const row = info.row.original;
          if (row.isSubtotal) {
            return <span className="font-semibold text-indigo-700">{info.getValue()}</span>;
          }
          if (row.isGrandTotal) {
            return <span className="font-bold text-red-700">{info.getValue()}</span>;
          }
          return info.getValue();
        },
      }),
      ...measureFields.map((field) =>
        columnHelper.accessor(field, {
          header: field,
          cell: (info) => {
            const row = info.row.original;
            const val = info.getValue();
            if (row.isSubtotal) {
              return <span className="font-semibold text-indigo-700">{val.toLocaleString()}</span>;
            }
            if (row.isGrandTotal) {
              return <span className="font-bold text-red-700">{val.toLocaleString()}</span>;
            }
            return <span className="text-right block">{val.toLocaleString()}</span>;
          },
          meta: {
            align: "right",
          },
        })
      ),
    ];
  }, [columnHelper]);

  const table = useReactTable({
    data: dataWithSubtotals,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Pivot Table with Subtotals & Grand Total</h1>
      <div className="overflow-x-auto border rounded shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    className={`px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                      header.column.columnDef.meta?.align === "right" ? "text-right" : ""
                    }`}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map((row) => {
              const isSubtotal = row.original.isSubtotal;
              const isGrandTotal = row.original.isGrandTotal;
              return (
                <tr
                  key={row.id}
                  className={
                    isGrandTotal
                      ? "bg-red-100 font-bold"
                      : isSubtotal
                      ? "bg-indigo-100 font-semibold"
                      : ""
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={`px-4 py-2 whitespace-nowrap ${
                        cell.column.columnDef.meta?.align === "right" ? "text-right" : ""
                      }`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}