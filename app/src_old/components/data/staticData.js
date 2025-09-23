export const originalData = [
    { name: 'Jan', users: 10 },
    { name: 'Feb', users: 20 },
    { name: 'Mar', users: 30 },
    { name: 'Apr', users: 40 },
    { name: 'May', users: 50 },
    { name: 'Jun', users: 60 },
    { name: 'Jul', users: 70 },
    { name: 'Aug', users: 80 },
    { name: 'Sep', users: 90 },
    { name: 'Oct', users: 100 },
  ];
  
  export const drillDataStatic = [
    { name: "Jan", uv: 4000 },
    { name: "Feb", uv: 3000 },
    { name: "Mar", uv: 2000 },
    { name: "Apr", uv: 2780 },
    { name: "May", uv: 1890 },
    { name: "Jun", uv: 2390 },
    { name: "Jul", uv: 3490 },
  ];
  
  export const productDataStatic = {
    Jan: [
      { product: "Product A", value: 2500 },
      { product: "Product B", value: 1500 },
    ],
    // ... rest of the product data
  };
  
  export const stateDataStatic = {
    Jan: [
      { state: "NY", value: 1500 },
      { state: "CA", value: 2500 },
    ],
    // ... rest of the state data
  };
  
  export const drillAcrossData = {
    "by-product": {
      Jan: [
        { product: "Product A", sales: 2500, marketShare: "62.5%", growth: "+10%" },
        { product: "Product B", sales: 1500, marketShare: "37.5%", growth: "+5%" }
      ],
      // ... rest of the by-product data
    },
    "by-state": {
      Jan: [
        { state: "NY", sales: 1500, population: "1M", density: "High" },
        { state: "CA", sales: 2500, population: "2M", density: "Medium" }
      ],
      // ... rest of the by-state data
    }
  };