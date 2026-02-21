import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import ReactECharts from 'echarts-for-react';

const data = [
  { name: 'Jan', uv: 400 },
  { name: 'Feb', uv: 300 },
  { name: 'Mar', uv: 200 },
  { name: 'Apr', uv: 278 },
  { name: 'May', uv: 189 },
];

const segments = [
  { data: data.slice(0, 2), color: 'red' },
  { data: data.slice(1, 3), color: 'green' },
  { data: data.slice(2, 5), color: 'blue' },
];

const segmentsDataEcharts = [
  { data: [[0, 400], [1, 300]], color: 'red' },
  { data: [[1, 300], [2, 200]], color: 'green' },
  { data: [[2, 200], [3, 278], [4, 189]], color: 'blue' },
];

function RechartsLine() {
  return (
    <LineChart width={500} height={300} data={data}>
      <CartesianGrid stroke="#ccc" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Line
        type="monotone"
        dataKey="uv"
        stroke="#8884d8"
        animationDuration={1500}
        animationEasing="ease-in-out"
        isAnimationActive={true}
      />
    </LineChart>
  );
}

function RechartsBar() {
  return (
    <BarChart width={500} height={300} data={data}>
      <CartesianGrid stroke="#ccc" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Bar
        dataKey="uv"
        fill="#82ca9d"
        animationDuration={1500}
        animationEasing="ease-in-out"
        isAnimationActive={true}
      />
    </BarChart>
  );
}

function RechartsSegmentedLine() {
  return (
    <LineChart width={500} height={300} data={data}>
      <CartesianGrid stroke="#ccc" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      {segments.map((segment, index) => (
        <Line
          key={index}
          type="monotone"
          data={segment.data}
          dataKey="uv"
          stroke={segment.color}
          animationDuration={1000}
          animationBegin={index * 1000}
          isAnimationActive={true}
          dot={false}
          activeDot={false}
        />
      ))}
    </LineChart>
  );
}

const optionLine = {
  xAxis: {
    type: 'category',
    data: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
  },
  yAxis: {
    type: 'value',
  },
  series: [
    {
      data: [400, 300, 200, 278, 189],
      type: 'line',
      smooth: true,
      animationDuration: 1500,
      animationEasing: 'cubicOut',
    },
  ],
};

const optionBar = {
  xAxis: {
    type: 'category',
    data: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
  },
  yAxis: {
    type: 'value',
  },
  series: [
    {
      data: [400, 300, 200, 278, 189],
      type: 'bar',
      animationDuration: 1500,
      animationEasing: 'cubicOut',
    },
  ],
};

const optionSegmentedLine = {
  xAxis: {
    type: 'category',
    data: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
  },
  yAxis: {
    type: 'value',
  },
  series: segmentsDataEcharts.map((segment, idx) => ({
    type: 'line',
    data: segment.data,
    lineStyle: { color: segment.color },
    animationDuration: 1000,
    animationDelay: idx * 1000,
    smooth: true,
    showSymbol: false,
  })),
};
const _optionMap = {
  geo: {
    map: 'world',
    roam: true,
    label: { show: false },
  },
  series: [
    {
      name: 'Points',
      type: 'scatter',
      coordinateSystem: 'geo',
      data: [
        { name: 'Beijing', value: [116.46, 39.92, 100] },
        { name: 'Shanghai', value: [121.48, 31.22, 80] },
      ],
      symbolSize: 12,
      animationDuration: 2000,
      animationEasing: 'cubicOut',
    },
  ],
};

export default function App() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40, padding: 20 }}>
      <div>
        <h3>Recharts Line Chart</h3>
        <RechartsLine />
      </div>
      <div>
        <h3>Recharts Bar Chart</h3>
        <RechartsBar />
      </div>
      <div>
        <h3>Recharts Segmented Line Chart</h3>
        <RechartsSegmentedLine />
      </div>
      <div>
        <h3>ECharts Line Chart</h3>
        <ReactECharts option={optionLine} style={{ width: 500, height: 300 }} />
      </div>
      <div>
        <h3>ECharts Bar Chart</h3>
        <ReactECharts option={optionBar} style={{ width: 500, height: 300 }} />
      </div>
      <div>
        <h3>ECharts Segmented Line Chart</h3>
        <ReactECharts option={optionSegmentedLine} style={{ width: 500, height: 300 }} />
      </div>
      <div>
        <h3>Map</h3>
       {/* <ReactECharts option={optionMap} /> */}
      </div>
    </div>
  );
}