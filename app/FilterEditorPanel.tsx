import React, { useState, useEffect } from 'react';
import { Filter, ValidationError } from '../../types/filter.types';
import { validateFilter } from '../../services/validationService';
import { apiCall } from '../../services/apiRepository';
import FilterMetadataForm from './FilterMetadataForm';
import ManualConditionsTab from './ManualConditionsTab';
import UIConfigPanel from './UIConfigPanel';
import TargetingPanel from './TargetingPanel';
import './FilterEditorPanel.css';

interface FilterEditorPanelProps {
  filter: Filter;
  onClose: () => void;
  onSave: () => void;
}

type TabType = 'metadata' | 'definition' | 'ui' | 'targeting';

const FilterEditorPanel: React.FC<FilterEditorPanelProps> = ({ filter, onClose, onSave }) => {
  const [draft, setDraft] = useState<Filter>(JSON.parse(JSON.stringify(filter)));
  const [activeTab, setActiveTab] = useState<TabType>('metadata');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    validateDraft();
  }, [draft]);

  const validateDraft = () => {
    const errors = validateFilter(draft);
    setValidationErrors(errors);
  };

  const handleFieldChange = (path: string, value: any) => {
    const keys = path.split('.');
    const newDraft = JSON.parse(JSON.stringify(draft));
    
    let current: any = newDraft;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    
    setDraft(newDraft);
    setIsDirty(true);
  };

  const handleSaveDraft = async () => {
    if (validationErrors.length > 0) {
      alert('Please fix validation errors before saving');
      return;
    }

    setIsSaving(true);
    try {
      const method = draft.id ? 'PUT' : 'POST';
      const url = draft.id ? `/filters/${draft.id}` : '/filters';
      const savedFilter = await apiCall<Filter>(method, url, draft);
      
      setDraft(savedFilter);
      setIsDirty(false);
      alert('Filter saved successfully');
    } catch (error) {
      console.error('Error saving filter:', error);
      alert('Error saving filter');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    const errors = validateFilter({ ...draft, status: 'published' });
    if (errors.length > 0) {
      alert('Cannot publish: ' + errors.map(e => e.message).join(', '));
      return;
    }

    if (!window.confirm('Are you sure you want to publish this filter?')) {
      return;
    }

    setIsSaving(true);
    try {
      const publishedDraft = { ...draft, status: 'published' as const, version: draft.version + 1 };
      const savedFilter = await apiCall<Filter>('PUT', `/filters/${draft.id}`, publishedDraft);
      
      // Upsert instances
      for (const instance of savedFilter.instances) {
        if (instance.id) {
          await apiCall('PUT', `/filter-instances/${instance.id}`, instance);
        } else {
          await apiCall('POST', `/filters/${savedFilter.id}/instances`, instance);
        }
      }

      setDraft(savedFilter);
      setIsDirty(false);
      alert('Filter published successfully');
      onSave();
    } catch (error) {
      console.error('Error publishing filter:', error);
      alert('Error publishing filter');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (isDirty && !window.confirm('You have unsaved changes. Are you sure you want to close?')) {
      return;
    }
    onClose();
  };

  return (
    <div className="filter-editor-panel">
      <div className="editor-header">
        <h2>{draft.id ? `Edit Filter: ${draft.name}` : 'New Filter'}</h2>
        <button className="btn-close" onClick={handleCancel}>
          ✕
        </button>
      </div>

      <div className="editor-tabs">
        <button
          className={activeTab === 'metadata' ? 'tab-active' : ''}
          onClick={() => setActiveTab('metadata')}
        >
          Metadata
        </button>
        <button
          className={activeTab === 'definition' ? 'tab-active' : ''}
          onClick={() => setActiveTab('definition')}
        >
          Definition
        </button>
        <button
          className={activeTab === 'ui' ? 'tab-active' : ''}
          onClick={() => setActiveTab('ui')}
        >
          UI Config
        </button>
        <button
          className={activeTab === 'targeting' ? 'tab-active' : ''}
          onClick={() => setActiveTab('targeting')}
        >
          Targeting
        </button>
      </div>

      <div className="editor-content">
        {activeTab === 'metadata' && (
          <FilterMetadataForm
            draft={draft}
            onChange={handleFieldChange}
            errors={validationErrors}
          />
        )}
        {activeTab === 'definition' && (
          <ManualConditionsTab
            definition={draft.definition}
            onChange={(def) => handleFieldChange('definition', def)}
            errors={validationErrors}
          />
        )}
        {activeTab === 'ui' && (
          <UIConfigPanel
            draft={draft}
            onChange={handleFieldChange}
            errors={validationErrors}
          />
        )}
        {activeTab === 'targeting' && (
          <TargetingPanel
            draft={draft}
            onChange={handleFieldChange}
            errors={validationErrors}
          />
        )}
      </div>

      {validationErrors.length > 0 && (
        <div className="validation-summary">
          <h4>Validation Errors:</h4>
          <ul>
            {validationErrors.map((error, index) => (
              <li key={index}>{error.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="editor-footer">
        <button className="btn-secondary" onClick={handleCancel} disabled={isSaving}>
          Cancel
        </button>
        <button className="btn-secondary" onClick={handleSaveDraft} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Draft'}
        </button>
        {draft.id && (
          <button className="btn-primary" onClick={handlePublish} disabled={isSaving}>
            {isSaving ? 'Publishing...' : 'Publish'}
          </button>
        )}
      </div>
    </div>
  );
};

export default FilterEditorPanel;