<main className="flex-1 overflow-auto p-10 bg-gray-50">
  <h1 className="text-xl font-semibold mb-6">
    Charts: <span className="text-gray-600">Bar, Pie, and Area Visualizations</span>
  </h1>

  {activeTab === "page1" ? (
    <>
    <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${firstRowPanels.length}, 1fr)`,
                  gridAutoRows: '400px',
                  gap: '24px',
                  marginBottom: '24px',
                }}
              >
                {firstRowPanels.map((panelKey, index) => (
                  <div
                    key={panelKey}
                    style={{ minWidth: 0, minHeight: 0 }}
                    draggable
                    onDragStart={(e) => onDragStart(e, index)}
                    onDragOver={onDragOver}
                    onDrop={(e) => onDrop(e, index)}
                    className="cursor-move"
                    aria-grabbed="false"
                  >
                  {panelKey === 'panel1' && (
      <Panel
        title="Monthly Sales Overview (Drillable)"
        panelKey="panel1"
        filterBox
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        panel1MinUsers={panel1MinUsers}
        setPanel1MinUsers={setPanel1MinUsers}
        panel1MaxUsers={panel1MaxUsers}
        setPanel1MaxUsers={setPanel1MaxUsers}
        filteredData={filteredDrillDataWithMonths}
        selectedPanels={selectedPanels}
        onMaximize={handleMaximize}
        menuOpen={openMenuPanel === 'panel1'}
        setMenuOpenGlobal={setOpenMenuPanel}
        setSelectedMonths={setSelectedMonths}
        setOtherPanelsFilteredMonths={setOtherPanelsFilteredMonths}  // Add this prop
      >
        {() => (
          <DrillableBarChart
            drillData={filteredDrillDataWithMonths}
            productData={filteredProductDataWithMonths}
            stateData={filteredStateDataWithMonths}
            stackingMode={stackingMode}
            setStackingMode={setStackingMode}
            drillAcross={drillAcross}
            setDrillAcross={setDrillAcross}
            contextMenu={contextMenu}
            setContextMenu={setContextMenu}
            submenuVisible={submenuVisible}
            setSubmenuVisible={setSubmenuVisible}
            setSelectedMonths={setSelectedMonths}
            setOtherPanelsFilteredMonths={setOtherPanelsFilteredMonths}  // Add this prop
          />
        )}
      </Panel>
    )}
                    {panelKey === 'panel2' && (
                      <Panel
                        title="User Distribution"
                        panelKey="panel2"
                        filteredData={filteredOtherPanelsData}
                        selectedPanels={selectedPanels}
                        onMaximize={handleMaximize}
                        menuOpen={openMenuPanel === 'panel2'}
                        setMenuOpenGlobal={setOpenMenuPanel}
                      >
                        {(data) => (
                          <div style={{ width: '100%', height: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={data}
                                  dataKey="users"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={80}
                                  label
                                >
                                  {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <ChartTooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </Panel>
                    )}
                    {panelKey === 'panel3' && (
                      <Panel
                        title="User Growth Trend"
                        panelKey="panel3"
                        filteredData={filteredOtherPanelsData}
                        selectedPanels={selectedPanels}
                        onMaximize={handleMaximize}
                        menuOpen={openMenuPanel === 'panel3'}
                        setMenuOpenGlobal={setOpenMenuPanel}
                      >
                        {(data) => (
                          <div style={{ width: '100%', height: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={data}>
                                <defs>
                                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <XAxis dataKey="name" />
                                <YAxis />
                                <CartesianGrid strokeDasharray="3 3" />
                                <ChartTooltip />
                                <Area type="monotone" dataKey="users" stroke="#6366F1" fill="url(#colorUsers)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </Panel>
                    )}
                  </div>
                ))}
              </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${firstRowPanels.length}, 1fr)`,
        gridAutoRows: '400px',
        gap: '24px',
        marginBottom: '24px',
      }}>
        {/* Your first row panels */}
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${secondRowPanels.length}, 1fr)`,
        gridAutoRows: '400px',
        gap: '24px',
      }}>
       <div
                   style={{
                     display: 'grid',
                     gridTemplateColumns: `repeat(${secondRowPanels.length}, 1fr)`,
                     gridAutoRows: '400px',
                     gap: '24px',
                   }}
                 >
                   {secondRowPanels.map((panelKey, index) => (
                     <div
                       key={panelKey}
                       style={{ minWidth: 0, minHeight: 0 }}
                       draggable
                       onDragStart={(e) => onDragStart(e, index + firstRowPanels.length)}
                       onDragOver={onDragOver}
                       onDrop={(e) => onDrop(e, index + firstRowPanels.length)}
                       className="cursor-move"
                       aria-grabbed="false"
                     >
                       {panelKey === 'panel4' && (
                         <Panel
                           title="User Breakdown (ECharts)"
                           panelKey="panel4"
                           filteredData={filteredOtherPanelsData}
                           selectedPanels={selectedPanels}
                           onMaximize={handleMaximize}
                           menuOpen={openMenuPanel === 'panel4'}
                           setMenuOpenGlobal={setOpenMenuPanel}
                         >
                           {(data) => {
                             const option = {
                               tooltip: { trigger: 'item' },
                               legend: { top: '5%', left: 'center' },
                               series: [
                                 {
                                   name: 'Users',
                                   type: 'pie',
                                   radius: ['40%', '70%'],
                                   avoidLabelOverlap: false,
                                   itemStyle: {
                                     borderRadius: 10,
                                     borderColor: '#fff',
                                     borderWidth: 2
                                   },
                                   label: { show: false, position: 'center' },
                                   emphasis: {
                                     label: {
                                       show: true,
                                       fontSize: '18',
                                       fontWeight: 'bold'
                                     }
                                   },
                                   labelLine: { show: false },
                                   data: data.map((item) => ({ value: item.users, name: item.name }))
                                 }
                               ]
                             };
                             return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />;
                           }}
                         </Panel>
                       )}
                       {panelKey === 'panel5' && (
                         <Panel
                           title="User Comparison (Recharts)"
                           panelKey="panel5"
                           filteredData={filteredOtherPanelsData}
                           selectedPanels={selectedPanels}
                           onMaximize={handleMaximize}
                           menuOpen={openMenuPanel === 'panel5'}
                           setMenuOpenGlobal={setOpenMenuPanel}
                         >
                           {(data) => (
                             <div style={{ width: '100%', height: '100%' }}>
                               <ResponsiveContainer width="100%" height="100%">
                                 <BarChart data={data}>
                                   <CartesianGrid strokeDasharray="3 3" />
                                   <XAxis dataKey="name" />
                                   <YAxis />
                                   <ChartTooltip />
                                   <Legend />
                                   <Bar dataKey="users" fill="#10B981" />
                                 </BarChart>
                               </ResponsiveContainer>
                             </div>
                           )}
                         </Panel>
                       )}
                     </div>
                   ))}
                 </div>
      </div>
    </>
  ) : (
    <Card className="mt-6">
      <CardHeader>
        <h3 className="text-lg font-medium">Detailed Data View</h3>
      </CardHeader>
      <CardContent>
        <TableComponent data={filteredData} />
      </CardContent>
    </Card>
  )}
</main>