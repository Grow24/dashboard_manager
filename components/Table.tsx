// components/Table.jsx

import { useTable } from "react-table";

const TableComponent = () => {
  const data = React.useMemo(
    () => [
      {
        name: "John Doe",
        age: 28,
        city: "New York",
      },
      {
        name: "Jane Smith",
        age: 22,
        city: "San Francisco",
      },
      // Add more data rows as needed
    ],
    []
  );

  const columns = React.useMemo(
    () => [
      {
        Header: "Name",
        accessor: "name", // key in data
      },
      {
        Header: "Age",
        accessor: "age",
      },
      {
        Header: "City",
        accessor: "city",
      },
    ],
    []
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = useTable({
    columns,
    data,
  });

  return (
    <table {...getTableProps()} className="min-w-full table-auto">
      <thead>
        {headerGroups.map((headerGroup) => (
          <tr {...headerGroup.getHeaderGroupProps()}>
            {headerGroup.headers.map((column) => (
              <th
                {...column.getHeaderProps()}
                className="px-4 py-2 text-left bg-gray-100"
              >
                {column.render("Header")}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody {...getTableBodyProps()}>
        {rows.map((row) => {
          prepareRow(row);
          return (
            <tr {...row.getRowProps()}>
              {row.cells.map((cell) => {
                return (
                  <td
                    {...cell.getCellProps()}
                    className="px-4 py-2 border-b"
                  >
                    {cell.render("Cell")}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default TableComponent;
