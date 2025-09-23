import React, { useState, useEffect } from "react";
import { Combobox } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/solid';

// MultiSelectCombobox component
const MultiSelectCombobox = ({
  options,
  value,
  onChange,
  placeholder = "Select...",
  loading = false,
}) => {
  const [query, setQuery] = useState("");
  const filteredOptions =
    query === ""
      ? options
      : options.filter((option) =>
          option.label.toLowerCase().includes(query.toLowerCase())
        );

  return (
    <Combobox value={value} onChange={onChange} multiple>
      <div className="relative">
        <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left border border-gray-300 shadow-sm focus-within:ring-2 focus-within:ring-blue-400">
          <Combobox.Input
            className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0"
            displayValue={(selected) =>
              selected
                .map(
                  (val) =>
                    options.find((option) => option.value === val)?.label || val
                )
                .join(", ")
            }
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
          />
          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon
              className="h-5 w-5 text-gray-400"
              aria-hidden="true"
            />
          </Combobox.Button>
        </div>
        <Combobox.Options className="combobox-options absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          {loading ? (
            <div className="px-4 py-2 text-gray-500">Loading...</div>
          ) : filteredOptions.length === 0 ? (
            <div className="px-4 py-2 text-gray-500">No options found.</div>
          ) : (
            filteredOptions.map((option) => (
              <Combobox.Option
                key={option.value}
                value={option.value}
                className={({ active }) =>
                  `combobox-option relative cursor-default select-none py-2 pl-10 pr-4 ${
                    active ? "bg-blue-600 text-white" : "text-gray-900"
                  }`
                }
              >
                {({ selected, active }) => (
                  <>
                    <span
                      className={`block truncate ${
                        selected ? "font-semibold" : "font-normal"
                      }`}
                    >
                      {option.label}
                    </span>
                    {selected ? (
                      <span
                        className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                          active ? "text-white" : "text-blue-600"
                        }`}
                      >
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    ) : null}
                  </>
                )}
              </Combobox.Option>
            ))
          )}
        </Combobox.Options>
      </div>
    </Combobox>
  );
};

const FilterPopup = ({ visible, filterField, onSave, onCancel }) => {
  const [filterSettings, setFilterSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState([]);
  const [value, setValue] = useState(
    filterSettings?.value || (filterSettings?.multiSelect ? [] : "")
  );

  useEffect(() => {
    if (visible && filterField) {
      setLoading(true);
      setFilterSettings(null);
      setOptions([]);
      setValue(filterSettings?.value || (filterSettings?.multiSelect ? [] : ""));

      // Fetch filter config from filtermaster API
      fetch("https://intelligentsalesman.com/ism1/API/tableu/filtermaster.php")
        .then((res) => res.json())
        .then((filters) => {
          const config = filters.find((f) => f.field === filterField.name);
          if (config) {
            const multiSelectFlag =
              config.multiSelect === 1 || config.multiSelect === true;
            setFilterSettings({
              ...config,
              value: config.defaultValue || (multiSelectFlag ? [] : ""),
            });
            if (config.webapi) {
              // Fetch options from webapi
              fetch(config.webapi)
                .then((res) => res.json())
                .then((data) => {
                  if (Array.isArray(data)) {
                    const opts = data.map((item) =>
                      typeof item === "string"
                        ? { value: item, label: item }
                        : {
                            value: item.value || item.id || item.label,
                            label: item.label || item.value || item.id,
                          }
                    );
                    setOptions(opts);
                  } else {
                    setOptions([]);
                  }
                })
                .catch(() => setOptions([]));
            } else {
              setOptions([]);
            }
          } else {
            setFilterSettings({ field: filterField.name, value: "" });
            setOptions([]);
          }
          setLoading(false);
        })
        .catch(() => {
          setFilterSettings({ field: filterField.name, value: "" });
          setOptions([]);
          setLoading(false);
        });
    } else {
      setFilterSettings(null);
      setOptions([]);
      setValue("");
    }
  }, [visible, filterField]);

  useEffect(() => {
    if (filterSettings) {
      setValue(filterSettings.value || (filterSettings.multiSelect ? [] : ""));
    }
  }, [filterSettings]);

  if (!visible) return null;

  const handleChange = (val) => {
    setValue(val);
  };

  const handleSave = () => {
    onSave({ ...filterSettings, value });
  };

  return (
    <div className="filter-popup-overlay">
      <div className="filter-popup">
        <h3>Filter Settings for {filterField?.name}</h3>
        {loading ? (
          <div>Loading...</div>
        ) : options.length > 0 ? (
          filterSettings?.multiSelect ? (
            <MultiSelectCombobox
              options={options}
              value={Array.isArray(value) ? value : value ? [value] : []}
              onChange={handleChange}
              placeholder={filterSettings?.placeholder || `Select ${filterField?.name}`}
              loading={loading}
            />
          ) : (
            <div className="relative">
              <select
                value={value || ""}
                onChange={(e) => handleChange(e.target.value)}
                style={{ width: "100%", height: "30px" }}
              >
                <option value="">-- Select --</option>
                {options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )
        ) : (
          <div>
            <label>
              Value:
              <input
                type="text"
                value={value || ""}
                onChange={(e) => handleChange(e.target.value)}
                placeholder={filterSettings?.placeholder || "Enter value"}
                style={{ width: "100%", padding: "6px", marginTop: "4px" }}
              />
            </label>
          </div>
        )}
        <div className="filter-popup-buttons" style={{ marginTop: "12px" }}>
          <button onClick={handleSave} style={{ marginRight: "8px" }}>
            Apply
          </button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default FilterPopup;