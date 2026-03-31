import { clsx } from "clsx";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

type BaseProps = {
  label: string;
  hint?: string;
  error?: string;
};

type InputFieldProps = BaseProps &
  InputHTMLAttributes<HTMLInputElement> & {
    multiline?: false;
  };

type TextareaFieldProps = BaseProps &
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    multiline: true;
  };

type TextFieldProps = InputFieldProps | TextareaFieldProps;

export function TextField(props: TextFieldProps) {
  if (props.multiline) {
    const textareaProps: Partial<TextareaFieldProps> = { ...props };
    delete textareaProps.label;
    delete textareaProps.hint;
    delete textareaProps.error;
    delete textareaProps.multiline;

    return (
      <label className="field">
        <span className="field-label">{props.label}</span>
        <textarea
          className={clsx("field-input field-textarea", props.className)}
          {...(textareaProps as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
        {props.error ? <span className="field-error">{props.error}</span> : props.hint ? <span className="field-hint">{props.hint}</span> : null}
      </label>
    );
  }

  const inputProps: Partial<InputFieldProps> = { ...props };
  delete inputProps.label;
  delete inputProps.hint;
  delete inputProps.error;

  return (
    <label className="field">
      <span className="field-label">{props.label}</span>
      <input className={clsx("field-input", props.className)} {...(inputProps as InputHTMLAttributes<HTMLInputElement>)} />
      {props.error ? <span className="field-error">{props.error}</span> : props.hint ? <span className="field-hint">{props.hint}</span> : null}
    </label>
  );
}
