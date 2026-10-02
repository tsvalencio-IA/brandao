import { X } from 'lucide-react';

export const Card = ({ children, className = '', ...props }) =>
  <div className={'card ' + className} {...props}>{children}</div>;

export const Button = ({ children, variant = 'primary', className = '', type = 'button', ...props }) =>
  <button type={type} className={'btn btn-' + variant + ' ' + className} {...props}>{children}</button>;

export const Field = ({ label, required, hint, children, className = '' }) => (
  <label className={'field ' + className}>
    {label && <span className="field-label">{label}{required ? ' *' : ''}</span>}
    {children}
    {hint && <small>{hint}</small>}
  </label>
);

export const Input = (props) => <input className={'input ' + (props.className || '')} {...props} />;
export const Select = (props) => <select className={'input ' + (props.className || '')} {...props} />;
export const Textarea = (props) => <textarea className={'input textarea ' + (props.className || '')} {...props} />;

export const EmptyState = ({ icon: Icon, title, text, action }) => (
  <div className="empty-state">
    {Icon && <div className="empty-icon"><Icon size={24} /></div>}
    <strong>{title}</strong>
    {text && <p>{text}</p>}
    {action}
  </div>
);

export const PageHeader = ({ title, description, actions }) => (
  <div className="page-header">
    <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
    {actions && <div className="page-actions">{actions}</div>}
  </div>
);

export function Modal({ open, title, onClose, children, wide = false }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={'modal ' + (wide ? 'modal-wide' : '')} role="dialog" aria-modal="true">
        <div className="modal-header"><h2>{title}</h2><button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar"><X size={18}/></button></div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export const Stat = ({ label, value, icon: Icon, detail }) => (
  <div className="stat-card">
    <div className="stat-top"><span>{label}</span>{Icon && <Icon size={17}/>}</div>
    <strong>{value}</strong>
    {detail && <small>{detail}</small>}
  </div>
);
