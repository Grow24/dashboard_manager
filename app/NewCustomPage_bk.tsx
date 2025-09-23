import React, { useState, useRef } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const DATA_ITEMS = [
  {
    id: 'country',
    name: 'Country',
    fields: ['Country Name', 'Country Code', 'Country Status', 'Country Value'],
    data: [
      { name: 'USA', code: '123', status: 'Active', value: 20 },
      { name: 'Canada', code: '124', status: 'Active', value: 30 },
      { name: 'Mexico', code: '125', status: 'Inactive', value: 40 },
      { name: 'Brazil', code: '126', status: 'Active', value: 50 },
      { name: 'Argentina', code: '127', status: 'Inactive', value: 60 },
      { name: 'Chile', code: '128', status: 'Active', value: 70 },
      { name: 'Colombia', code: '129', status: 'Active', value: 80 },
      { name: 'Peru', code: '130', status: 'Inactive', value: 90 },
      { name: 'Venezuela', code: '131', status: 'Active', value: 100 },
      { name: 'Ecuador', code: '132', status: 'Inactive', value: 10 },
    ],
  },
  {
    id: 'state',
    name: 'State',
    fields: ['State Name', 'State Code', 'State Status', 'State Value'],
    data: [
      { name: 'Maharashtra', code: '123', status: 'Active', value: 200 },
      { name: 'Gujrat', code: '124', status: 'Active', value: 300 },
      { name: 'UP', code: '125', status: 'Inactive', value: 400 },
      { name: 'MP', code: '126', status: 'Active', value: 500 },
      { name: 'Haidrbad', code: '127', status: 'Inactive', value: 600 },
      { name: 'Banglore', code: '128', status: 'Active', value: 700 },
      { name: 'Kalkata', code: '129', status: 'Active', value: 800 },
      { name: 'Hariyana', code: '130', status: 'Inactive', value: 900 },
      { name: 'Bihar', code: '131', status: 'Active', value: 1000 },
      { name: 'Panjab', code: '132', status: 'Inactive', value: 100 },
    ],
  },
  {
    id: 'city',
    name: 'City',
    fields: ['City Name', 'City Code', 'City Status', 'City Value'],
    data: [],
  },
];

const NewCustomPage = () => {
  const [droppedItem, setDroppedItem] = useState(null); // { item, target }
  const [selectedField, setSelectedField] = useState(null); // single field selected for table
  const [hoveredTarget, setHoveredTarget] = useState(null); // 'column' | 'row' | null

  // Dropdown state for blank area drop
  const [dropdownInfo, setDropdownInfo] = useState(null); // { item, x, y }

  // Use refs to track drag enter counts for each drop zone
  const dragEnterCount = useRef({ column: 0, row: 0 });

  // Drag start handler: set dataTransfer with item id
  const onDragStart = (e, itemId) => {
    e.dataTransfer.setData('text/plain', itemId);
  };

  // Allow drop
  const onDragOver = (e) => {
    e.preventDefault();
  };

  // Handle drag enter with counter to avoid flicker
  const onDragEnter = (target) => (e) => {
    e.preventDefault();
    dragEnterCount.current[target] += 1;
    if (dragEnterCount.current[target] === 1) {
      setHoveredTarget(target);
    }
  };

  // Handle drag leave with counter to avoid flicker
  const onDragLeave = (target) => (e) => {
    e.preventDefault();
    dragEnterCount.current[target] -= 1;
    if (dragEnterCount.current[target] === 0) {
      setHoveredTarget(null);
    }
  };

  // Handle drop on Column or Row box
  const onDrop = (e, target) => {
    e.preventDefault();
    dragEnterCount.current[target] = 0; // reset counter on drop
    setHoveredTarget(null); // clear hover on drop
    setDropdownInfo(null); // hide dropdown if visible
    const itemId = e.dataTransfer.getData('text/plain');
    const item = DATA_ITEMS.find((d) => d.id === itemId);
    if (item) {
      setDroppedItem({ item, target });
      setSelectedField(null); // reset selected field on new drop
    }
  };

  // Handle drop on blank area below boxes
  const onDropBlankArea = (e) => {
    e.preventDefault();
    setHoveredTarget(null);
    dragEnterCount.current.column = 0;
    dragEnterCount.current.row = 0;
    const itemId = e.dataTransfer.getData('text/plain');
    const item = DATA_ITEMS.find((d) => d.id === itemId);
    if (item) {
      // Get mouse position relative to container
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setDropdownInfo({ item, x, y });
      setDroppedItem(null);
      setSelectedField(null);
    }
  };

  // Handle field selection to bind to table
  const onFieldClick = (field) => {
    setSelectedField(field);
    setDropdownInfo(null); // hide dropdown if open
  };

  // Handle dropdown selection (example: just alert or you can extend)
  const onDropdownSelect = (name) => {
    alert(`Selected from dropdown: ${name}`);
    setDropdownInfo(null);
  };

  // Prepare table data for selected field
  const tableData = () => {
    if (!droppedItem || !selectedField) return [];
    const { item } = droppedItem;
    return item.data.map((entry, idx) => {
      switch (selectedField) {
        case 'Country Name':
        case 'State Name':
        case 'City Name':
          return { id: idx, value: entry.name };
        case 'Country Code':
        case 'State Code':
        case 'City Code':
          return { id: idx, value: entry.code };
        case 'Country Status':
        case 'State Status':
        case 'City Status':
          return { id: idx, value: entry.status };
        case 'Country Value':
        case 'State Value':
        case 'City Value':
          return { id: idx, value: entry.value };
        default:
          return { id: idx, value: '' };
      }
    });
  };

  // Prepare chart data based on Country Value
  const chartData = () => {
    if (!droppedItem || !selectedField) return null;
    const { item } = droppedItem;
    // Only show chart if selectedField is a Name field
    if (!selectedField.toLowerCase().includes('name')) return null;

    const labels = item.data.map((entry) => entry.name);
    const values = item.data.map((entry) => entry.value);

    return {
      labels,
      datasets: [
        {
          label: `${item.name} Value`,
          data: values,
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
        },
      ],
    };
  };

  // Helper to get border color class based on hover and drop state
  const getBorderClass = (target) => {
    if (hoveredTarget === target) return 'border-gray-600';
    if (droppedItem?.target === target) return 'border-blue-600';
    return 'border-gray-400';
  };

  return (
    <div className="p-6 bg-white rounded shadow min-h-screen flex flex-col gap-6 relative">
      <h1 className="text-3xl font-bold mb-4">New Custom Page</h1>

      <div className="flex gap-6">
        {/* Left: List view */}
        <div className="w-1/4 p-4 border rounded bg-gray-50">
          <h2 className="text-xl font-semibold mb-2">List View</h2>
          {DATA_ITEMS.map((item) => (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => onDragStart(e, item.id)}
              className="p-2 mb-2 bg-white border rounded cursor-move hover:bg-gray-100"
            >
              {item.name}
            </div>
          ))}
        </div>

        {/* Middle: Column and Row drop zones + fields */}
        <div className="w-1/3 flex flex-col gap-4">
          <div className="flex gap-4">
            <div
              className={`flex-1 p-4 border border-dashed rounded text-center cursor-pointer ${getBorderClass(
                'column'
              )}`}
              onDrop={(e) => onDrop(e, 'column')}
              onDragOver={onDragOver}
              onDragEnter={onDragEnter('column')}
              onDragLeave={onDragLeave('column')}
            >
              <strong>Column</strong>
              {droppedItem?.target === 'column' && (
                <div className="mt-2 text-left">
                  <p className="font-semibold">{droppedItem.item.name} Fields:</p>
                  <ul>
                    {droppedItem.item.fields.map((field) => (
                      <li
                        key={field}
                        className={`cursor-pointer hover:underline ${
                          selectedField === field ? 'font-bold text-blue-600' : ''
                        }`}
                        onClick={() => onFieldClick(field)}
                      >
                        {field}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div
              className={`flex-1 p-4 border border-dashed rounded text-center cursor-pointer ${getBorderClass(
                'row'
              )}`}
              onDrop={(e) => onDrop(e, 'row')}
              onDragOver={onDragOver}
              onDragEnter={onDragEnter('row')}
              onDragLeave={onDragLeave('row')}
            >
              <strong>Row</strong>
              {droppedItem?.target === 'row' && (
                <div className="mt-2 text-left">
                  <p className="font-semibold">{droppedItem.item.name} Fields:</p>
                  <ul>
                    {droppedItem.item.fields.map((field) => (
                      <li
                        key={field}
                        className={`cursor-pointer hover:underline ${
                          selectedField === field ? 'font-bold text-blue-600' : ''
                        }`}
                        onClick={() => onFieldClick(field)}
                      >
                        {field}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Blank drop area below Column and Row boxes */}
          <div
            className="flex-1 mt-4 p-6 border border-dashed border-gray-400 rounded bg-gray-50 relative"
            style={{ minHeight: 150 }}
            onDrop={onDropBlankArea}
            onDragOver={onDragOver}
          >
            <p className="text-center text-gray-500">Drop here to show dropdown</p>

            {/* Dropdown positioned at drop point */}
            {dropdownInfo && (
              <select
                style={{
                  position: 'absolute',
                  top: dropdownInfo.y,
                  left: dropdownInfo.x,
                  zIndex: 1000,
                }}
                onChange={(e) => onDropdownSelect(e.target.value)}
                defaultValue=""
              >
                <option value="" disabled>
                  Select {dropdownInfo.item.name}
                </option>
                {dropdownInfo.item.data.map((entry, idx) => (
                  <option key={idx} value={entry.name}>
                    {entry.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Right: Table view + Chart */}
        <div className="flex-1 p-4 border rounded bg-gray-100 min-h-[200px] flex flex-col gap-4">
          <h2 className="text-xl font-semibold mb-2">Table View</h2>
          {selectedField ? (
            <table className="w-full border-collapse border border-gray-400">
              <thead>
                <tr>
                  <th className="border border-gray-300 px-2 py-1 bg-gray-200 text-left">
                    {selectedField}
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableData().map(({ id, value }) => (
                  <tr key={id}>
                    <td className="border border-gray-300 px-2 py-1">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500">Select a field to build the table</p>
          )}

          {/* Chart next to table */}
          {selectedField && chartData() && (
            <div className="mt-4">
              <Bar
                data={chartData()}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: `${droppedItem.item.name} Value Chart` },
                  },
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewCustomPage;