import { useRef, useState } from 'react';
import { Paperclip, Upload, X } from 'lucide-react';
import { cloudinaryConfigured, uploadToCloudinary } from '../services/cloudinary';
import { Button } from './ui';

export default function AttachmentField({ value = [], onChange, max = 20, accept = 'image/*,video/*,.pdf' }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const pick = async (event) => {
    const selected = Array.from(event.target.files || []).slice(0, Math.max(0, max - value.length));
    event.target.value = '';
    if (!selected.length) return;
    if (!cloudinaryConfigured) {
      setError('Cloudinary ainda não configurado. A área de anexos já está pronta; configure as variáveis para liberar uploads.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const uploaded = [];
      for (const file of selected) {
        uploaded.push({ ...(await uploadToCloudinary(file)), name: file.name, type: file.type });
      }
      onChange?.([...value, ...uploaded]);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="attachments">
      <div className="attachment-toolbar">
        <input ref={inputRef} type="file" hidden multiple accept={accept} onChange={pick}/>
        <Button variant="secondary" onClick={() => inputRef.current?.click()} disabled={uploading || value.length >= max}>
          <Upload size={15}/> {uploading ? 'Enviando...' : 'Adicionar arquivos'}
        </Button>
        <span>{value.length}/{max}</span>
      </div>
      {!cloudinaryConfigured && <div className="config-note">Uploads aguardando configuração do Cloudinary.</div>}
      {error && <div className="form-error">{error}</div>}
      {value.length > 0 && <div className="attachment-list">
        {value.map((item, i) => (
          <div className="attachment-chip" key={item.public_id || item.url || i}>
            <Paperclip size={13}/><span>{item.name || 'Arquivo ' + (i + 1)}</span>
            <button onClick={() => onChange?.(value.filter((_, idx) => idx !== i))}><X size={12}/></button>
          </div>
        ))}
      </div>}
    </div>
  );
}
