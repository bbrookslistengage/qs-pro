import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Database, TrashBinTrash, AddCircle, InfoCircle } from '@solar-icons/react';
import { cn } from '@/lib/utils';
import type { DataExtensionDraft, DataExtensionField, SFMCFieldType } from '@/features/editor-workspace/types';

interface DataExtensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (data: DataExtensionDraft) => void;
}

export function DataExtensionModal({ isOpen, onClose, onSave }: DataExtensionModalProps) {
  const [name, setName] = useState('');
  const [customerKey, setCustomerKey] = useState('');
  const [fields, setFields] = useState<DataExtensionField[]>([]);

  const handleAddField = () => {
    setFields((prev) => [
      ...prev,
      {
        name: '',
        type: 'Text',
        length: undefined,
        isPrimaryKey: false,
        isNullable: true,
      },
    ]);
  };

  const handleUpdateField = (index: number, updates: Partial<DataExtensionField>) => {
    setFields((prev) =>
      prev.map((field, idx) => (idx === index ? { ...field, ...updates } : field))
    );
  };

  const handleRemoveField = (index: number) => {
    setFields((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    const trimmedKey = customerKey.trim();
    if (!trimmedName || !trimmedKey) return;
    onSave?.({
      name: trimmedName,
      customerKey: trimmedKey,
      fields,
    });
    setName('');
    setCustomerKey('');
    setFields([]);
    onClose();
  };

  const handleClose = () => {
    setName('');
    setCustomerKey('');
    setFields([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-3xl bg-card border-border">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
              <Database size={24} weight="Bold" className="text-primary" />
            </div>
            <div>
              <DialogTitle className="font-display text-xl font-bold">Create Data Extension</DialogTitle>
              <p className="text-xs text-muted-foreground">Define a new target table in Marketing Cloud</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Metadata Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Name</label>
              <input 
                type="text" 
                placeholder="e.g. Master_Subscriber_Feed"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Customer Key</label>
              <input 
                type="text" 
                placeholder="External ID"
                value={customerKey}
                onChange={(event) => setCustomerKey(event.target.value)}
                className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Fields Editor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fields Configuration</span>
              <button
                type="button"
                onClick={handleAddField}
                className="flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary-400 uppercase tracking-widest"
              >
                <AddCircle size={14} /> Add Field
              </button>
            </div>
            
            <div className="max-h-[240px] overflow-y-auto space-y-2 pr-2">
              {fields.length === 0 ? (
                <div className="text-[11px] text-muted-foreground px-2 py-3 border border-dashed border-border rounded-lg text-center">
                  No fields added yet. Use “Add Field” to define your schema.
                </div>
              ) : (
                fields.map((field, index) => (
                  <FieldRow
                    key={`${field.name}-${index}`}
                    field={field}
                    onChange={(updates) => handleUpdateField(index, updates)}
                    onRemove={() => handleRemoveField(index)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Retention Policy */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border flex items-center justify-between">
            <div className="flex gap-3">
              <InfoCircle size={20} className="text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs font-bold text-foreground">Data Retention Policy</p>
                <p className="text-[10px] text-muted-foreground">Automatically purge records or entire table after a set period.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Off</span>
              <div className="w-8 h-4 bg-muted border border-border rounded-full relative">
                <div className="absolute left-0.5 top-0.5 w-2.5 h-2.5 bg-muted-foreground rounded-full" />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border pt-4">
          <Button variant="ghost" onClick={handleClose} className="text-xs font-bold">Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || !customerKey.trim()}
            className="bg-primary hover:bg-primary-600 text-primary-foreground text-xs font-bold shadow-lg shadow-primary/20"
          >
            Create Data Extension
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface FieldRowProps {
  field: DataExtensionField;
  onChange: (updates: Partial<DataExtensionField>) => void;
  onRemove: () => void;
}

function FieldRow({ field, onChange, onRemove }: FieldRowProps) {
  return (
    <div className="grid grid-cols-14 gap-2 items-center bg-card p-2 rounded border border-border/50 hover:border-primary/50 transition-colors group">
      <div className="col-span-3">
        <input
          type="text"
          value={field.name}
          onChange={(event) => onChange({ name: event.target.value })}
          placeholder="Field name"
          className="w-full bg-transparent text-xs focus:outline-none"
        />
      </div>
      <div className="col-span-3">
        <select
          value={field.type}
          onChange={(event) => onChange({ type: event.target.value as SFMCFieldType })}
          className="w-full bg-transparent text-xs focus:outline-none cursor-pointer"
        >
          <option value="Text">Text</option>
          <option value="Number">Number</option>
          <option value="Date">Date</option>
          <option value="Boolean">Boolean</option>
          <option value="Decimal">Decimal</option>
          <option value="Email">Email</option>
          <option value="Phone">Phone</option>
        </select>
      </div>
      <div className="col-span-2">
        <input
          type="text"
          value={field.length ?? ''}
          onChange={(event) => {
            const value = event.target.value;
            const numericValue = Number(value);
            onChange({ length: value && !Number.isNaN(numericValue) ? numericValue : undefined });
          }}
          placeholder="Len"
          className="w-full bg-transparent text-xs text-center focus:outline-none"
        />
      </div>
      <div className="col-span-3">
        <input type="text" placeholder="Default" className="w-full bg-transparent text-xs focus:outline-none" />
      </div>
      <div className="col-span-1 flex justify-center">
        <button
          type="button"
          onClick={() => onChange({ isPrimaryKey: !field.isPrimaryKey })}
          className={cn(
            "w-3.5 h-3.5 rounded-sm border flex items-center justify-center",
            field.isPrimaryKey ? "bg-primary border-primary" : "border-border"
          )}
          aria-label="Toggle primary key"
        >
          {field.isPrimaryKey && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
        </button>
      </div>
      <div className="col-span-1 flex justify-center">
        <button
          type="button"
          onClick={() => onChange({ isNullable: !field.isNullable })}
          className={cn(
            "w-3.5 h-3.5 rounded-sm border flex items-center justify-center",
            field.isNullable ? "border-primary" : "border-border"
          )}
          aria-label="Toggle nullable"
        >
           {field.isNullable && <div className="w-1.5 h-1.5 bg-primary rounded-full" />}
        </button>
      </div>
      <div className="col-span-1 flex justify-end">
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
          aria-label="Remove field"
        >
          <TrashBinTrash size={14} />
        </button>
      </div>
    </div>
  );
}
