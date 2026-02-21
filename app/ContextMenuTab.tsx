import React, { useState, useEffect } from 'react';
import { Pencil, Trash2 } from 'lucide-react'; // Install: npm install lucide-react

const ContextMenuTab = () => {
  const [menuName, setMenuName] = useState('');
  const [eventName, setEventName] = useState('');
  const [parentId, setParentId] = useState('');
  const [sortOrder, setSortOrder] = useState(0);

  const [contextMenus, setContextMenus] = useState([]);
  const [widgets, setWidgets] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [selectedWidget, setSelectedWidget] = useState('');
  const [selectedContextMenu, setSelectedContextMenu] = useState('');

  const [editingMenu, setEditingMenu] = useState(null);
  const [editingAssignment, setEditingAssignment] = useState(null);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState('create');

  const API_BASE =
    'https://intelligentsalesman.com/ism1/API/dashboard_manager/api/index.php';

  useEffect(() => {
    fetchContextMenus();
    fetchWidgets();
    fetchAssignments();
  }, []);

  useEffect(() => {
    if (!message && !error) return;
    const timer = setTimeout(() => {
      setMessage('');
      setError('');
    }, 5000);
    return () => clearTimeout(timer);
  }, [message, error]);

  const fetchContextMenus = async () => {
    try {
      const res = await fetch(`${API_BASE}?resource=context_menus`);
      const data = await res.json();
      console.log('Context Menus API Response:', data); // Debug log
      setContextMenus(data);
    } catch {
      setError('Failed to fetch context menus');
    }
  };

  const fetchWidgets = async () => {
    try {
      const res = await fetch(`${API_BASE}?resource=widgets`);
      const data = await res.json();
      setWidgets(data);
    } catch {
      setError('Failed to fetch widgets');
    }
  };

  const fetchAssignments = async () => {
    try {
      const res = await fetch(
        `${API_BASE}?resource=widget_context_menu_assignments`
      );
      const data = await res.json();
      setAssignments(data);
    } catch {
      setError('Failed to fetch widget-context menu assignments');
    }
  };

  const handleCreateContextMenu = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}?resource=context_menus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu_name: menuName,
          event_name: eventName,
          parent_id: parentId || null,
          sort_order: Number(sortOrder),
        }),
      });
      if (res.ok) {
        setMessage('Context menu created successfully');
        setMenuName('');
        setEventName('');
        setParentId('');
        setSortOrder(0);
        fetchContextMenus();
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to create context menu');
      }
    } catch {
      setError('Network error while creating context menu');
    }
  };

  const handleUpdateContextMenu = async (menuId, updatedData) => {
    setError('');
    setMessage('');
    try {
      const res = await fetch(
        `${API_BASE}?resource=context_menus&id=${menuId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedData),
        }
      );
      if (res.ok) {
        setMessage('Context menu updated successfully');
        setEditingMenu(null);
        fetchContextMenus();
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to update context menu');
      }
    } catch {
      setError('Network error while updating context menu');
    }
  };

  const handleDeleteContextMenu = async (menuId) => {
    if (!window.confirm('Are you sure you want to delete this context menu?'))
      return;
    setError('');
    setMessage('');
    try {
      const res = await fetch(
        `${API_BASE}?resource=context_menus&id=${menuId}`,
        {
          method: 'DELETE',
        }
      );
      if (res.ok) {
        setMessage('Context menu deleted successfully');
        fetchContextMenus();
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to delete context menu');
      }
    } catch {
      setError('Network error while deleting context menu');
    }
  };

  const handleAssignContextMenu = async () => {
    if (!selectedWidget || !selectedContextMenu) {
      setError('Please select both a widget and a context menu');
      return;
    }
    setError('');
    setMessage('');

    try {
      const res = await fetch(
        `${API_BASE}?resource=widget_context_menu_assignments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            widget_id: Number(selectedWidget),
            context_menu_id: Number(selectedContextMenu),
          }),
        }
      );

      if (res.ok || res.status === 201) {
        setMessage('Context menu assigned to widget successfully');
        setSelectedWidget('');
        setSelectedContextMenu('');
        fetchAssignments();
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to assign context menu to widget');
      }
    } catch {
      setError('Network error while assigning context menu');
    }
  };

  const handleUpdateAssignment = async (assignmentId, updatedData) => {
    setError('');
    setMessage('');
    try {
      const res = await fetch(
        `${API_BASE}?resource=widget_context_menu_assignments&id=${assignmentId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedData),
        }
      );
      if (res.ok) {
        setMessage('Assignment updated successfully');
        setEditingAssignment(null);
        fetchAssignments();
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to update assignment');
      }
    } catch {
      setError('Network error while updating assignment');
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!window.confirm('Remove this context menu assignment?')) return;
    setError('');
    setMessage('');

    try {
      const res = await fetch(
        `${API_BASE}?resource=widget_context_menu_assignments&id=${assignmentId}`,
        {
          method: 'DELETE',
        }
      );

      if (res.ok) {
        setMessage('Assignment removed successfully');
        fetchAssignments();
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to delete assignment');
      }
    } catch {
      setError('Network error while deleting assignment');
    }
  };

  // ======== HIERARCHY HELPERS (UPDATED) ========

  // Safely extract parentId from a menu object, handling both parent_id and parentId
  const getParentId = (menu) => {
    if (!menu) return null;

    if (menu.parent_id !== undefined && menu.parent_id !== null) {
      return Number(menu.parent_id);
    }
    if (menu.parentId !== undefined && menu.parentId !== null) {
      return Number(menu.parentId);
    }
    return null;
  };

  const getMenuNameById = (id) => {
    if (!id) return 'None';
    const numericId = Number(id);
    const menu = contextMenus.find((m) => Number(m.id) === numericId);
    return menu ? menu.menu_name : 'None';
  };

  const getWidgetTitleById = (id) => {
    const numericId = Number(id);
    const widget = widgets.find((w) => Number(w.id) === numericId);
    return widget ? widget.title : 'Unknown Widget';
  };

  /**
   * Build full hierarchy: Top → Mid → Leaf
   * Walk up parents until there is no parent or we hit a safety depth (e.g. 10)
   */
  const getMenuHierarchy = (menu) => {
    if (!menu) return '';

    const chain = [menu.menu_name]; // start with self
    let currentParentId = getParentId(menu);
    let safety = 0;

    while (currentParentId && safety < 10) {
      safety += 1;
      const parent = contextMenus.find(
        (m) => Number(m.id) === Number(currentParentId)
      );
      if (!parent) break;

      // Add parent name at the beginning of the chain
      chain.unshift(parent.menu_name);

      // Move one level up
      currentParentId = getParentId(parent);
    }

    // Join all levels with arrows
    return chain.join(' → ');
  };

  // =============================================

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Notifications */}
      {message && (
        <div className="rounded-md bg-green-50 p-4 text-green-700 border border-green-200">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {/* Tabs wrapper */}
      <section className="bg-white shadow rounded-lg">
        {/* Tab headers */}
        <div className="border-b border-gray-200 px-6 pt-4">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`whitespace-nowrap border-b-2 px-1 pb-2 text-sm font-medium transition-colors ${
                activeTab === 'create'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Create Context Menu
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('assign')}
              className={`whitespace-nowrap border-b-2 px-1 pb-2 text-sm font-medium transition-colors ${
                activeTab === 'assign'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Assign Context Menu to Widget
            </button>
          </nav>
        </div>

        {/* Tab panels */}
        <div className="p-6">
          {/* Create Context Menu (Tab 1) */}
          {activeTab === 'create' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">
                Create Context Menu
              </h2>
              <form onSubmit={handleCreateContextMenu} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="menuName"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Menu Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="menuName"
                      type="text"
                      value={menuName}
                      onChange={(e) => setMenuName(e.target.value)}
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter menu name"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="eventName"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Event Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="eventName"
                      type="text"
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter event name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="parentId"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Parent Menu (Optional)
                    </label>
                    <select
                      id="parentId"
                      value={parentId}
                      onChange={(e) => setParentId(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">None</option>
                      {contextMenus.map((menu) => (
                        <option key={menu.id} value={menu.id}>
                          {menu.menu_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="sortOrder"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Sort Order
                    </label>
                    <input
                      id="sortOrder"
                      type="number"
                      min="0"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="0"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-6 py-2 text-white font-semibold hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                >
                  Create Context Menu
                </button>
              </form>
            </div>
          )}

          {/* Assign Context Menu to Widget (Tab 2) */}
          {activeTab === 'assign' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">
                Assign Context Menu to Widget
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label
                    htmlFor="widgetSelect"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Select Widget
                  </label>
                  <select
                    id="widgetSelect"
                    value={selectedWidget}
                    onChange={(e) => setSelectedWidget(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select a widget</option>
                    {widgets.map((widget) => (
                      <option key={widget.id} value={widget.id}>
                        {widget.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="contextMenuSelect"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Select Context Menu
                  </label>
                  <select
                    id="contextMenuSelect"
                    value={selectedContextMenu}
                    onChange={(e) => setSelectedContextMenu(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select a context menu</option>
                    {contextMenus.map((menu) => (
                      <option key={menu.id} value={menu.id}>
                        {menu.menu_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={handleAssignContextMenu}
                className="inline-flex justify-center rounded-md border border-transparent bg-green-600 px-6 py-2 text-white font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
              >
                Assign Context Menu to Widget
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Existing Context Menus Table */}
      <section className="bg-white shadow rounded-lg p-6 overflow-x-auto">
        <h2 className="text-xl font-semibold mb-4">Existing Context Menus</h2>
        {contextMenus.length === 0 ? (
          <p className="text-gray-500">No context menus found.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Menu Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Parent Menu
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Menu Hierarchy
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sort Order
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {contextMenus.map((menu) => (
                <tr key={menu.id} className="hover:bg-gray-50">
                  {editingMenu?.id === menu.id ? (
                    <>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {menu.id}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <input
                          type="text"
                          value={editingMenu.menu_name}
                          onChange={(e) =>
                            setEditingMenu({
                              ...editingMenu,
                              menu_name: e.target.value,
                            })
                          }
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <input
                          type="text"
                          value={editingMenu.event_name}
                          onChange={(e) =>
                            setEditingMenu({
                              ...editingMenu,
                              event_name: e.target.value,
                            })
                          }
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <select
                          value={getParentId(editingMenu) || ''}
                          onChange={(e) =>
                            setEditingMenu({
                              ...editingMenu,
                              parent_id: e.target.value || null,
                              parentId: e.target.value || null,
                            })
                          }
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        >
                          <option value="">None</option>
                          {contextMenus
                            .filter((m) => m.id !== menu.id)
                            .map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.menu_name}
                              </option>
                            ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {getMenuHierarchy(editingMenu)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <input
                          type="number"
                          value={editingMenu.sort_order}
                          onChange={(e) =>
                            setEditingMenu({
                              ...editingMenu,
                              sort_order: e.target.value,
                            })
                          }
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() =>
                            handleUpdateContextMenu(menu.id, editingMenu)
                          }
                          className="text-green-600 hover:text-green-800 font-medium"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingMenu(null)}
                          className="text-gray-600 hover:text-gray-800 font-medium"
                        >
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {menu.id}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {menu.menu_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {menu.event_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {getMenuNameById(getParentId(menu))}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {getMenuHierarchy(menu)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {menu.sort_order}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm space-x-3">
                        <button
                          onClick={() => setEditingMenu({ ...menu })}
                          className="text-indigo-600 hover:text-indigo-800 inline-flex items-center"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteContextMenu(menu.id)}
                          className="text-red-600 hover:text-red-800 inline-flex items-center"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Widget-Context Menu Assignments Table */}
      <section className="bg-white shadow rounded-lg p-6 overflow-x-auto">
        <h2 className="text-xl font-semibold mb-4">
          Widget - Context Menu Assignments
        </h2>
        {assignments.length === 0 ? (
          <p className="text-gray-500">No assignments found.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assignment ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Widget
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Context Menu
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assignments.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  {editingAssignment?.id === a.id ? (
                    <>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {a.id}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <select
                          value={editingAssignment.widget_id}
                          onChange={(e) =>
                            setEditingAssignment({
                              ...editingAssignment,
                              widget_id: e.target.value,
                            })
                          }
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        >
                          {widgets.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.title}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <select
                          value={editingAssignment.context_menu_id}
                          onChange={(e) =>
                            setEditingAssignment({
                              ...editingAssignment,
                              context_menu_id: e.target.value,
                            })
                          }
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        >
                          {contextMenus.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.menu_name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {a.event_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() =>
                            handleUpdateAssignment(a.id, editingAssignment)
                          }
                          className="text-green-600 hover:text-green-800 font-medium"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingAssignment(null)}
                          className="text-gray-600 hover:text-gray-800 font-medium"
                        >
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {a.id}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {a.widget_title || getWidgetTitleById(a.widget_id)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {a.menu_name || getMenuNameById(a.context_menu_id)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {a.event_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm space-x-3">
                        <button
                          onClick={() => setEditingAssignment({ ...a })}
                          className="text-indigo-600 hover:text-indigo-800 inline-flex items-center"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAssignment(a.id)}
                          className="text-red-600 hover:text-red-800 inline-flex items-center"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default ContextMenuTab;