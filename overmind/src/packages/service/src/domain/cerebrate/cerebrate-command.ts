export interface TextCerebrateCommand {
  type: 'text';
  text: string;
}

export interface FileCerebrateCommand {
  type: 'file';
  file: string;
}

export interface ScriptCerebrateCommand {
  type: 'script';
  script: string;
}

export type CerebrateCommandValue = TextCerebrateCommand | FileCerebrateCommand | ScriptCerebrateCommand;

export interface CerebrateCommand {
  name: string;
  value: CerebrateCommandValue;
}
