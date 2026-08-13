import { 
  ElementSummary, 
  BreadcrumbItem, 
  ComponentExtractionResult, 
  ExportOptions 
} from './types';

export type MessageType =
  | 'PING'
  | 'PONG'
  | 'START_INSPECT'
  | 'STOP_INSPECT'
  | 'ELEMENT_HOVERED'
  | 'ELEMENT_SELECTED'
  | 'NAVIGATE_DOM'
  | 'DESELECT_ELEMENT'
  | 'EXTRACT_COMPONENT'
  | 'EXTRACTION_RESULT'
  | 'FETCH_ASSET_BLOB'
  | 'TOGGLE_SIMILAR_HIGHLIGHT'
  | 'INSPECTION_STATUS_CHANGED'
  | 'ERROR_OCCURRED';

export interface BaseMessage<T extends MessageType, P = any> {
  type: T;
  payload: P;
  timestamp?: number;
}

export type PingMessage = BaseMessage<'PING', { from: 'sidepanel' | 'content' | 'background' }>;
export type PongMessage = BaseMessage<'PONG', { from: 'sidepanel' | 'content' | 'background'; tabId?: number }>;

export type StartInspectMessage = BaseMessage<'START_INSPECT', { options?: Partial<ExportOptions> }>;
export type StopInspectMessage = BaseMessage<'STOP_INSPECT', Record<string, never>>;

export type ElementHoveredMessage = BaseMessage<'ELEMENT_HOVERED', {
  summary: ElementSummary | null;
  similarCount: number;
}>;

export type ElementSelectedMessage = BaseMessage<'ELEMENT_SELECTED', {
  summary: ElementSummary;
  breadcrumbs: BreadcrumbItem[];
  similarCount: number;
  hasParent: boolean;
  hasChildren: boolean;
  extractionResult?: ComponentExtractionResult | null;
}>;

export type NavigateDomMessage = BaseMessage<'NAVIGATE_DOM', {
  direction: 'parent' | 'child' | 'prev-sibling' | 'next-sibling' | 'breadcrumb-select';
  targetPath?: string;
}>;

export type DeselectElementMessage = BaseMessage<'DESELECT_ELEMENT', Record<string, never>>;

export type ExtractComponentMessage = BaseMessage<'EXTRACT_COMPONENT', {
  options: ExportOptions;
}>;

export type ExtractionResultMessage = BaseMessage<'EXTRACTION_RESULT', {
  result: ComponentExtractionResult;
}>;

export type FetchAssetBlobMessage = BaseMessage<'FETCH_ASSET_BLOB', {
  url: string;
}>;

export type ToggleSimilarHighlightMessage = BaseMessage<'TOGGLE_SIMILAR_HIGHLIGHT', {
  enabled: boolean;
}>;

export type InspectionStatusChangedMessage = BaseMessage<'INSPECTION_STATUS_CHANGED', {
  isInspecting: boolean;
  hasSelection: boolean;
}>;

export type ErrorOccurredMessage = BaseMessage<'ERROR_OCCURRED', {
  message: string;
  code?: string;
}>;

export type ExtensionMessage =
  | PingMessage
  | PongMessage
  | StartInspectMessage
  | StopInspectMessage
  | ElementHoveredMessage
  | ElementSelectedMessage
  | NavigateDomMessage
  | DeselectElementMessage
  | ExtractComponentMessage
  | ExtractionResultMessage
  | FetchAssetBlobMessage
  | ToggleSimilarHighlightMessage
  | InspectionStatusChangedMessage
  | ErrorOccurredMessage;
