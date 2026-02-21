import React, { useEffect, useState, useMemo } from "react";

const barMaxWidth = 300;
const API_BASE = "https://intelligentsalesman.com/ism1/API/dashboard_manager"; // Adjust to your backend URL

function App() {
  // State
  const [data, setData] = useState([]);
  const [groups, setGroups] = useState([]);
  const [sets, setSets] = useState([]);
  const [selection, setSelection] = useState(null);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch all data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/getData.php`);
      const json = await res.json();
      setData(json.categories || []);
      setGroups(json.groups || []);
      setSets(json.sets || []);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    }
    setLoading(false);
  };

  // Map category to group id
  const categoryToGroupId = useMemo(() => {
    const map = {};
    groups.forEach((g) => {
      g.categories.forEach((c) => {
        map[c] = g.id;
      });
    });
    return map;
  }, [groups]);

  // Compute set categories based on type
  const computedSets = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.value - a.value);
    const result = {};
    sets.forEach((set) => {
      if (set.type === "top") {
        result[set.id] = sorted.slice(0, set.count).map((d) => d.code);
      } else if (set.type === "bottom") {
        result[set.id] = sorted.slice(-set.count).map((d) => d.code);
      } else if (set.type === "manual") {
        result[set.id] = set.categories || [];
      }
    });
    return result;
  }, [sets, data]);

  // Get selected categories
  const selectedCategories = useMemo(() => {
    if (!selection) return [];
    if (selection.type === "group") {
      const group = groups.find((g) => g.id === selection.id);
      return group ? group.categories : [];
    }
    if (selection.type === "set") {
      return computedSets[selection.id] || [];
    }
    return [];
  }, [selection, groups, computedSets]);

  // Opacity for brushing
  const getOpacity = (category) => {
    if (!selection) return 1;
    return selectedCategories.includes(category) ? 1 : 0.2;
  };

  // Toggle selection
  const toggleSelection = (type, id) => {
    if (selection && selection.type === type && selection.id === id) {
      setSelection(null);
    } else {
      setSelection({ type, id });
    }
  };

  // Add group
  const addGroup = async () => {
    const name = prompt("Enter group name:");
    if (!name) return;
    const catsStr = prompt("Enter categories (comma separated), e.g. A,B,C");
    if (!catsStr) return;
    const cats = catsStr
      .split(",")
      .map((c) => c.trim())
      .filter((c) => data.some((d) => d.code === c));
    if (cats.length === 0) {
      alert("No valid categories entered.");
      return;
    }

    try {
      await fetch(`${API_BASE}/addGroup.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, categories: cats }),
      });
      fetchData(); // Refresh
    } catch (err) {
      console.error("Failed to add group:", err);
    }
  };

  // Remove group
  const removeGroup = async (id) => {
    if (!window.confirm("Remove this group?")) return;
    const numericId = id.replace("g", "");
    try {
      await fetch(`${API_BASE}/delete.php?type=group&id=${numericId}`);
      if (selection?.type === "group" && selection.id === id)
        setSelection(null);
      fetchData();
    } catch (err) {
      console.error("Failed to remove group:", err);
    }
  };

  // Add set
  const addSet = async () => {
    const name = prompt("Enter set name:");
    if (!name) return;
    const type = prompt('Enter set type: "top", "bottom", or "manual":');
    if (!["top", "bottom", "manual"].includes(type)) {
      alert('Set type must be "top", "bottom", or "manual".');
      return;
    }

    let payload = { name, type };

    if (type === "manual") {
      const catsStr = prompt("Enter categories (comma separated), e.g. A,B,C");
      if (!catsStr) return;
      const cats = catsStr
        .split(",")
        .map((c) => c.trim())
        .filter((c) => data.some((d) => d.code === c));
      if (cats.length === 0) {
        alert("No valid categories entered.");
        return;
      }
      payload.categories = cats;
    } else {
      const countStr = prompt("Enter count (number of categories):");
      const count = parseInt(countStr, 10);
      if (isNaN(count) || count < 1 || count > data.length) {
        alert("Invalid count.");
        return;
      }
      payload.count = count;
    }

    try {
      await fetch(`${API_BASE}/addSet.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      fetchData();
    } catch (err) {
      console.error("Failed to add set:", err);
    }
  };

  // Remove set
  const removeSet = async (id) => {
    if (!window.confirm("Remove this set?")) return;
    const numericId = id.replace("s", "");
    try {
      await fetch(`${API_BASE}/delete.php?type=set&id=${numericId}`);
      if (selection?.type === "set" && selection.id === id) setSelection(null);
      fetchData();
    } catch (err) {
      console.error("Failed to remove set:", err);
    }
  };

  // Bar component
  const Bar = ({ category, value }) => {
    const maxVal = Math.max(...data.map((d) => d.value));
    const width = (value / maxVal) * barMaxWidth;
    const opacity = getOpacity(category);
    const groupId = categoryToGroupId[category];
    const group = groups.find((g) => g.id === groupId);
    const inSelectedSet =
      selection?.type === "set" &&
      computedSets[selection.id]?.includes(category);

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 6,
          cursor: "pointer",
          opacity,
          position: "relative",
        }}
        onMouseEnter={() =>
          setHoverInfo({
            category,
            value,
            group: group?.name || "None",
            inSets: sets
              .filter((s) => computedSets[s.id]?.includes(category))
              .map((s) => s.name),
          })
        }
        onMouseLeave={() => setHoverInfo(null)}
        onClick={() => {
          if (group) {
            toggleSelection("group", group.id);
          } else if (inSelectedSet) {
            setSelection(null);
          }
        }}
      >
        <div
          style={{
            width,
            height: 24,
            backgroundColor: group
              ? selection?.type === "group" && selection.id === group.id
                ? "#1f77b4"
                : "#aec7e8"
              : inSelectedSet
              ? "#ff7f0e"
              : "#d3d3d3",
            borderRadius: 4,
            transition: "opacity 0.3s",
          }}
        />
        <div
          style={{
            marginLeft: 8,
            minWidth: 20,
            fontWeight: "bold",
            userSelect: "none",
          }}
        >
          {category}
        </div>
        <div
          style={{
            marginLeft: 8,
            color: "#555",
            userSelect: "none",
            fontSize: 12,
          }}
        >
          {value}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div
        style={{
          fontFamily: "sans-serif",
          maxWidth: 700,
          margin: "20px auto",
          textAlign: "center",
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
        margin: "20px auto",
        padding: 20,
        border: "1px solid #ddd",
        borderRadius: 8,
        backgroundColor: "#fff",
      }}
    >
      <h1 style={{ textAlign: "center", marginBottom: 20 }}>
        Groups vs Sets (Dynamic Implementation)
      </h1>

      <div style={{ display: "flex", gap: 40 }}>
        {/* Left panel: Bars */}
        <div style={{ flex: 1 }}>
          <h2>Data Bars</h2>
          {data.length === 0 && (
            <div style={{ fontStyle: "italic", color: "#888" }}>
              No data available.
            </div>
          )}
          {data.map((d) => (
            <Bar key={d.code} category={d.code} value={d.value} />
          ))}
        </div>

        {/* Right panel: Groups and Sets */}
        <div style={{ flex: 1 }}>
          <h2>Groups</h2>
          <button
            onClick={addGroup}
            style={{
              marginBottom: 8,
              padding: "6px 12px",
              cursor: "pointer",
              backgroundColor: "#1f77b4",
              color: "white",
              border: "none",
              borderRadius: 4,
            }}
          >
            + Add Group
          </button>
          {groups.length === 0 && (
            <div style={{ fontStyle: "italic", color: "#888" }}>
              No groups defined.
            </div>
          )}
          {groups.map(({ id, name, categories }) => (
            <div
              key={id}
              style={{
                border:
                  selection?.type === "group" && selection.id === id
                    ? "2px solid #1f77b4"
                    : "1px solid #ccc",
                borderRadius: 6,
                padding: 8,
                marginBottom: 8,
                cursor: "pointer",
                backgroundColor:
                  selection?.type === "group" && selection.id === id
                    ? "#e6f0fa"
                    : "transparent",
              }}
              onClick={() => toggleSelection("group", id)}
              onMouseEnter={() =>
                setHoverInfo({
                  group: name,
                  categories,
                })
              }
              onMouseLeave={() => setHoverInfo(null)}
            >
              <div
                style={{
                  fontWeight: "bold",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>{name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeGroup(id);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#c00",
                    fontWeight: "bold",
                    cursor: "pointer",
                    fontSize: 18,
                  }}
                  title="Remove group"
                >
                  ×
                </button>
              </div>
              <div style={{ fontSize: 12, color: "#555" }}>
                Categories: {categories.join(", ")}
              </div>
            </div>
          ))}

          <h2 style={{ marginTop: 24 }}>Sets</h2>
          <button
            onClick={addSet}
            style={{
              marginBottom: 8,
              padding: "6px 12px",
              cursor: "pointer",
              backgroundColor: "#ff7f0e",
              color: "white",
              border: "none",
              borderRadius: 4,
            }}
          >
            + Add Set
          </button>
          {sets.length === 0 && (
            <div style={{ fontStyle: "italic", color: "#888" }}>
              No sets defined.
            </div>
          )}
          {sets.map(({ id, name, type, count }) => (
            <div
              key={id}
              style={{
                border:
                  selection?.type === "set" && selection.id === id
                    ? "2px solid #ff7f0e"
                    : "1px solid #ccc",
                borderRadius: 6,
                padding: 8,
                marginBottom: 8,
                cursor: "pointer",
                backgroundColor:
                  selection?.type === "set" && selection.id === id
                    ? "#fff3e0"
                    : "transparent",
              }}
              onClick={() => toggleSelection("set", id)}
              onMouseEnter={() =>
                setHoverInfo({
                  set: name,
                  type,
                  count,
                  categories: computedSets[id],
                })
              }
              onMouseLeave={() => setHoverInfo(null)}
            >
              <div
                style={{
                  fontWeight: "bold",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>
                  {name}{" "}
                  {type === "manual" ? "(Manual)" : `(${type} ${count})`}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSet(id);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#c00",
                    fontWeight: "bold",
                    cursor: "pointer",
                    fontSize: 18,
                  }}
                  title="Remove set"
                >
                  ×
                </button>
              </div>
              <div style={{ fontSize: 12, color: "#555" }}>
                Categories: {computedSets[id]?.join(", ") || ""}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* JSON structure */}
      <div
        style={{
          marginTop: 30,
          padding: 12,
          backgroundColor: "#f9f9f9",
          borderRadius: 6,
          fontFamily: "monospace",
          fontSize: 12,
          maxHeight: 200,
          overflowY: "auto",
          border: "1px solid #ddd",
        }}
      >
        <h3>Current Groups & Sets JSON</h3>
        <pre>
          {JSON.stringify(
            {
              groups,
              sets,
              selection,
            },
            null,
            2
          )}
        </pre>
      </div>

      {/* Popup */}
      {hoverInfo && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            width: 280,
            backgroundColor: "white",
            border: "1px solid #ccc",
            borderRadius: 6,
            padding: 12,
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            zIndex: 1000,
            fontSize: 14,
            color: "#333",
          }}
        >
          {hoverInfo.category && (
            <>
              <div>
                <strong>Category:</strong> {hoverInfo.category}
              </div>
              <div>
                <strong>Value:</strong> {hoverInfo.value}
              </div>
              <div>
                <strong>Group:</strong> {hoverInfo.group || "None"}
              </div>
              <div>
                <strong>In Sets:</strong>{" "}
                {hoverInfo.inSets && hoverInfo.inSets.length > 0
                  ? hoverInfo.inSets.join(", ")
                  : "None"}
              </div>
            </>
          )}
          {hoverInfo.group && !hoverInfo.category && (
            <>
              <div>
                <strong>Group:</strong> {hoverInfo.group}
              </div>
              <div>
                <strong>Categories:</strong> {hoverInfo.categories.join(", ")}
              </div>
            </>
          )}
          {hoverInfo.set && (
            <>
              <div>
                <strong>Set:</strong> {hoverInfo.set}
              </div>
              <div>
                <strong>Type:</strong> {hoverInfo.type}
              </div>
              {hoverInfo.count !== undefined && (
                <div>
                  <strong>Count:</strong> {hoverInfo.count}
                </div>
              )}
              <div>
                <strong>Categories:</strong>{" "}
                {hoverInfo.categories?.join(", ") || ""}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default App;