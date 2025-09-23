import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const chartData = [
  { id: 1, countryName: 'USA', countryCode: 'US', stateName: 'California', stateCode: 'CA', cityName: 'Los Angeles', cityCode: 'LA', salesValue: 100 },
  { id: 2, countryName: 'USA', countryCode: 'US', stateName: 'California', stateCode: 'CA', cityName: 'San Francisco', cityCode: 'SF', salesValue: 200 },
  { id: 3, countryName: 'USA', countryCode: 'US', stateName: 'New York', stateCode: 'NY', cityName: 'New York City', cityCode: 'NYC', salesValue: 300 },
  { id: 4, countryName: 'Canada', countryCode: 'CA', stateName: 'Ontario', stateCode: 'ON', cityName: 'Toronto', cityCode: 'TO', salesValue: 400 },
  { id: 5, countryName: 'Canada', countryCode: 'CA', stateName: 'Quebec', stateCode: 'QC', cityName: 'Montreal', cityCode: 'MTL', salesValue: 500 },
  { id: 6, countryName: 'Mexico', countryCode: 'MX', stateName: 'Jalisco', stateCode: 'JA', cityName: 'Guadalajara', cityCode: 'GDL', salesValue: 600 },
  { id: 7, countryName: 'Mexico', countryCode: 'MX', stateName: 'Mexico City', stateCode: 'MXC', cityName: 'Mexico City', cityCode: 'MXC', salesValue: 700 },
  { id: 8, countryName: 'Brazil', countryCode: 'BR', stateName: 'Sao Paulo', stateCode: 'SP', cityName: 'Sao Paulo', cityCode: 'SP', salesValue: 800 },
  { id: 9, countryName: 'Brazil', countryCode: 'BR', stateName: 'Rio de Janeiro', stateCode: 'RJ', cityName: 'Rio de Janeiro', cityCode: 'RJ', salesValue: 900 },
  { id: 10, countryName: 'Argentina', countryCode: 'AR', stateName: 'Buenos Aires', stateCode: 'BA', cityName: 'Buenos Aires', cityCode: 'BA', salesValue: 1000 },
  { id: 11, countryName: 'Chile', countryCode: 'CL', stateName: 'Santiago', stateCode: 'ST', cityName: 'Santiago', cityCode: 'ST', salesValue: 1100 },
  { id: 12, countryName: 'Colombia', countryCode: 'CO', stateName: 'Bogota', stateCode: 'BG', cityName: 'Bogota', cityCode: 'BG', salesValue: 1200 },
  { id: 13, countryName: 'Peru', countryCode: 'PE', stateName: 'Lima', stateCode: 'LI', cityName: 'Lima', cityCode: 'LI', salesValue: 1300 },
  { id: 14, countryName: 'Venezuela', countryCode: 'VE', stateName: 'Caracas', stateCode: 'CA', cityName: 'Caracas', cityCode: 'CA', salesValue: 1400 },
  { id: 15, countryName: 'Ecuador', countryCode: 'EC', stateName: 'Quito', stateCode: 'QU', cityName: 'Quito', cityCode: 'QU', salesValue: 1500 },
  { id: 16, countryName: 'USA', countryCode: 'US', stateName: 'Texas', stateCode: 'TX', cityName: 'Houston', cityCode: 'HOU', salesValue: 1600 },
  { id: 17, countryName: 'USA', countryCode: 'US', stateName: 'Texas', stateCode: 'TX', cityName: 'Dallas', cityCode: 'DAL', salesValue: 1700 },
  { id: 18, countryName: 'Canada', countryCode: 'CA', stateName: 'British Columbia', stateCode: 'BC', cityName: 'Vancouver', cityCode: 'VAN', salesValue: 1800 },
  { id: 19, countryName: 'Mexico', countryCode: 'MX', stateName: 'Nuevo Leon', stateCode: 'NL', cityName: 'Monterrey', cityCode: 'MTY', salesValue: 1900 },
  { id: 20, countryName: 'Brazil', countryCode: 'BR', stateName: 'Bahia', stateCode: 'BA', cityName: 'Salvador', cityCode: 'SAL', salesValue: 2000 },
];

const functions = {
  max: (arr) => (arr.length ? Math.max(...arr) : null),
  min: (arr) => (arr.length ? Math.min(...arr) : null),
  avg: (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null),
};

const NewCustomPage = () => {
  const [draggedField, setDraggedField] = useState(null);
  const [columnDropped, setColumnDropped] = useState(false);
  const [selectedFunction, setSelectedFunction] = useState('max');
  const [countrySalesMap, setCountrySalesMap] = useState({});

  const fieldsToShow = ['id', 'countryName', 'countryCode', 'salesValue'];

  const onDragStartField = (e, field) => {
    if (field === 'salesValue') {
      e.dataTransfer.setData('field', field);
      setDraggedField(field);
    }
  };

  const onDragStartCountry = (e) => {
    e.dataTransfer.setData('field', 'Country');
  };

  const onDropColumn = (e) => {
    e.preventDefault();
    const field = e.dataTransfer.getData('field');
    if (field === 'Country') {
      setColumnDropped(true);
      setCountrySalesMap({});
    }
  };

  const onDragOver = (e) => e.preventDefault();

  const onDropSalesValue = (e, countryName) => {
    e.preventDefault();
    const field = e.dataTransfer.getData('field');
    if (field === 'salesValue' && draggedField === 'salesValue') {
      // Validate drop location: only allow drop on correct country row
      const draggedSalesValue = parseInt(e.dataTransfer.getData('text/plain'), 10);
      const draggedCountry = chartData.find(item => item.salesValue === draggedSalesValue)?.countryName;
      if (draggedCountry !== countryName) {
        alert("Incorrect Drop Location: You can only drop the sales value next to the correct country.");
        return;
      }
      // Update sales map for that country
      const salesForCountry = chartData
        .filter((d) => d.countryName === countryName)
        .reduce((acc, cur) => acc + cur.salesValue, 0);
      setCountrySalesMap((prev) => ({ ...prev, [countryName]: salesForCountry }));
    }
  };

  const onDragOverSalesCell = (e) => e.preventDefault();

  // Unique countries only if columnDropped
  const uniqueCountries = columnDropped ? [...new Set(chartData.map((d) => d.countryName))] : [];

  // Compute sales values per country based on selected function and current drops
  // If a country has a dropped sales value, use that; else show empty
  const displayedSalesValues = uniqueCountries.map((country) => {
    if (countrySalesMap[country] !== undefined) {
      // Apply selected function on the single value (just return it)
      return countrySalesMap[country];
    }
    return '';
  });

  // Compute function result on all dropped sales values
  const salesValuesArray = Object.values(countrySalesMap);
  const functionResult = functions[selectedFunction](salesValuesArray);

  return (
    <div className="p-4 md:p-6 min-h-screen bg-gray-100 flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        {/* Left Panel */}
        <Card className="w-full md:w-1/4">
          <CardHeader>
            <CardTitle>List View</CardTitle>
            <CardDescription>Drag and drop items</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div
              draggable
              onDragStart={onDragStartCountry}
              className="p-2 bg-white rounded-md shadow-sm cursor-move text-center font-semibold hover:bg-gray-200 transition-colors duration-200"
            >
              Country
            </div>
            <div className="p-2 bg-white rounded-md shadow-sm text-center font-semibold">State</div>
            <div className="p-2 bg-white rounded-md shadow-sm text-center font-semibold">City</div>
          </CardContent>
        </Card>

        {/* Column Box */}
        <Card
          className="w-full md:w-1/3 border-dashed text-center cursor-pointer select-none"
          onDrop={onDropColumn}
          onDragOver={onDragOver}
          style={{ minHeight: 100 }}
        >
          <CardHeader>
            <CardTitle>Column Box</CardTitle>
            <CardDescription>Drop "Country" here</CardDescription>
          </CardHeader>
          <CardContent>
            {columnDropped && (
              <div className="overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {fieldsToShow.map((field) => (
                        <TableHead key={field} className="text-left">
                          {field}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chartData.map((row) => (
                      <TableRow key={row.id} className="hover:bg-gray-100">
                        {fieldsToShow.map((field) => (
                          <TableCell
                            key={field}
                            className={`font-medium ${field === 'salesValue' ? 'cursor-move' : ''}`}
                            draggable={field === 'salesValue'}
                            onDragStart={(e) => {
                              e.dataTransfer.setData('field', field);
                              e.dataTransfer.setData('text/plain', row.salesValue.toString());
                              setDraggedField(field);
                            }}
                          >
                            {row[field]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Country Sales Table */}
        <Card className="w-full md:w-1/3 overflow-auto max-h-[500px] relative">
          <CardHeader>
            <CardTitle>Country Sales Table</CardTitle>
            <CardDescription>Drop Sales Value next to country</CardDescription>
          </CardHeader>
          <CardContent>
            {columnDropped && (
              <>
               {salesValuesArray.length > 0 && (
                  <div className="mt-2 text-right font-semibold">
                    Function Result: {functionResult !== null ? functionResult.toFixed(2) : 'N/A'}
                  </div>
                )}
                <div className="flex justify-end mb-2">
                  <Label htmlFor="functionSelect" className="text-sm font-medium mr-2">
                    Select Function:
                  </Label>
                  <Select
                    value={selectedFunction}
                    onValueChange={(value) => setSelectedFunction(value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select a function" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="max">Max</SelectItem>
                      <SelectItem value="min">Min</SelectItem>
                      <SelectItem value="avg">Avg</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left">Country Name</TableHead>
                      <TableHead className="text-left">Sales Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uniqueCountries.map((country, index) => (
                      <TableRow key={country} className="hover:bg-gray-100">
                        <TableCell className="font-medium">{country}</TableCell>
                        <TableCell
                          className="cursor-pointer"
                          onDrop={(e) => onDropSalesValue(e, country)}
                          onDragOver={onDragOverSalesCell}
                        >
                          {displayedSalesValues[index] !== '' ? displayedSalesValues[index] : ''}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
               
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NewCustomPage;