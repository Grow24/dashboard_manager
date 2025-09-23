function Page() {
  const [minUserss, setMinUsers] = useState('');
  const [maxUserss, setMaxUsers] = useState('');
  const [selectedMonthss, setSelectedMonths] = useState<string[]>([]);
  // ... other states

  const [filterHistory, setFilterHistory] = useState([]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addFilterToHistory = (filter, source) => {
    setFilterHistory(prev => [
      ...prev,
      {
        id: generateId(),
        source,
        minUserss: filter.minUserss || '',
        maxUserss: filter.maxUserss || '',
        selectedMonthss: filter.selectedMonthss || [],
        timestamp: new Date().toISOString(),
      }
    ]);
  };

  useEffect(() => {
    addFilterToHistory({ minUserss, maxUserss, selectedMonthss }, 'Global Filter');
  }, [minUserss, maxUserss, selectedMonthss]);

  // Similarly for page-wise and panel-wise filters...

  return (
    <>
      {/* Pass filter states as props to DrillableBarChart */}
      <DrillableBarChart
        minUserss={minUserss}
        maxUserss={maxUserss}
        selectedMonthss={selectedMonthss}
        // other props
      />
      {/* Your other components */}
    </>
  );
}