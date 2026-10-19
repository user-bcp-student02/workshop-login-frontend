export type LabelValue = string | number | boolean | null;

export interface Task {
  title?: string;
  description?: string;
  status?: string;
  priority?: LabelValue;
  owner?: LabelValue;
}

export interface VisibleTask extends Task {
  label: string;
}
